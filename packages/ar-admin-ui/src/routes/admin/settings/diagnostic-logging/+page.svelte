<script lang="ts">
	import { onMount } from 'svelte';
	import Alert from '$lib/components/Alert.svelte';
	import ToggleSwitch from '$lib/components/ToggleSwitch.svelte';
	import { adminSettingsAPI, type CategorySettings } from '$lib/api/admin-settings';
	import { settingsContext } from '$lib/stores/settings-context.svelte';

	type ExportFormat = 'json' | 'jsonl' | 'text';
	type SortMode = 'category' | 'timeline' | 'session';

	// Export form state
	let tenantId = $state('default');
	let startDate = $state('');
	let endDate = $state('');
	let sessionIds = $state('');
	let categories = $state({
		'http-request': false,
		'http-response': false,
		'token-validation': true,
		'auth-decision': true
	});
	let format = $state<ExportFormat>('json');
	let sortMode = $state<SortMode>('timeline');
	let includeStats = $state(false);
	let selectedClientIds = $state<string[]>([]);

	// Connection test state
	let testTenantId = $state('default');
	let r2BucketBinding = $state('DIAGNOSTIC_LOGS');
	let pathPrefix = $state('diagnostic-logs');

	// UI state
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let settingsLoading = $state(false);
	let settingsSaving = $state(false);
	let settingsError = $state('');
	let loggingSettings = $state<CategorySettings | null>(null);
	let loggingEnabled = $state(false);
	let r2OutputEnabled = $state(false);
	let sdkIngestEnabled = $state(false);
	let mergedOutputEnabled = $state(false);
	let clientsLoading = $state(false);
	let clientsError = $state('');
	let clientOptions = $state<{ id: string; name: string }[]>([]);
	let testLoading = $state(false);
	let testError = $state('');
	let testSuccess = $state('');
	let testLatency = $state<number | null>(null);

	const canEdit = $derived(settingsContext.canEditAtCurrentScope());

	onMount(async () => {
		await settingsContext.initialize();
		tenantId = settingsContext.tenantId;

		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		endDate = now.toISOString().split('T')[0];
		startDate = sevenDaysAgo.toISOString().split('T')[0];
		testTenantId = tenantId;

		await loadLoggingSettings();
		await loadClientOptions();
	});

	async function loadLoggingSettings() {
		settingsLoading = true;
		settingsError = '';

		try {
			const result = await adminSettingsAPI.getSettings('diagnostic-logging', tenantId);
			loggingSettings = result;
			loggingEnabled = Boolean(result.values['diagnostic-logging.enabled']);
			r2OutputEnabled = Boolean(result.values['diagnostic-logging.r2_output_enabled']);
			sdkIngestEnabled = Boolean(result.values['diagnostic-logging.sdk_ingest_enabled']);
			mergedOutputEnabled = Boolean(result.values['diagnostic-logging.merged_output_enabled']);
		} catch (err) {
			settingsError = err instanceof Error ? err.message : 'Failed to load diagnostic settings';
		} finally {
			settingsLoading = false;
		}
	}

	async function loadClientOptions() {
		clientsLoading = true;
		clientsError = '';

		try {
			const allClients: { id: string; name: string }[] = [];
			let page = 1;
			const limit = 200;

			while (true) {
				const response = await fetch(
					`/api/admin/clients?page=${page}&limit=${limit}`,
					{
						credentials: 'include'
					}
				);

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.message || 'Failed to load clients');
				}

				const data = await response.json();
				const clients = Array.isArray(data.clients) ? data.clients : [];

				allClients.push(
					...clients.map((client: { client_id: string; client_name?: string }) => ({
						id: client.client_id,
						name: client.client_name || client.client_id
					}))
				);

				if (!data.pagination?.hasNext) {
					break;
				}

				page += 1;
			}

			clientOptions = allClients;
		} catch (err) {
			clientsError = err instanceof Error ? err.message : 'Failed to load clients';
			clientOptions = [];
		} finally {
			clientsLoading = false;
		}
	}

	async function handleTenantChange(nextTenantId: string) {
		const previousTenantId = settingsContext.tenantId;
		if (!nextTenantId || nextTenantId === previousTenantId) return;
		tenantId = nextTenantId;
		testTenantId = nextTenantId;
		selectedClientIds = [];
		await settingsContext.setTenantId(nextTenantId);
		await loadLoggingSettings();
		await loadClientOptions();
	}

	async function handleToggleLogging(enabled: boolean) {
		if (!loggingSettings || settingsSaving) return;

		settingsSaving = true;
		settingsError = '';

		try {
			const result = await adminSettingsAPI.updateSettings(
				'diagnostic-logging',
				{
					ifMatch: loggingSettings.version,
					set: {
						'diagnostic-logging.enabled': enabled
					}
				},
				tenantId
			);

			loggingSettings = {
				...loggingSettings,
				version: result.newVersion,
				values: {
					...loggingSettings.values,
					'diagnostic-logging.enabled': enabled
				}
			};
			loggingEnabled = enabled;
		} catch (err) {
			settingsError = err instanceof Error ? err.message : 'Failed to update diagnostic settings';
		} finally {
			settingsSaving = false;
		}
	}

	async function handleToggleR2Output(enabled: boolean) {
		if (!loggingSettings || settingsSaving) return;

		settingsSaving = true;
		settingsError = '';

		try {
			const result = await adminSettingsAPI.updateSettings(
				'diagnostic-logging',
				{
					ifMatch: loggingSettings.version,
					set: {
						'diagnostic-logging.r2_output_enabled': enabled
					}
				},
				tenantId
			);

			loggingSettings = {
				...loggingSettings,
				version: result.newVersion,
				values: {
					...loggingSettings.values,
					'diagnostic-logging.r2_output_enabled': enabled
				}
			};
			r2OutputEnabled = enabled;
		} catch (err) {
			settingsError = err instanceof Error ? err.message : 'Failed to update diagnostic settings';
		} finally {
			settingsSaving = false;
		}
	}

	async function handleToggleSdkIngest(enabled: boolean) {
		if (!loggingSettings || settingsSaving) return;

		settingsSaving = true;
		settingsError = '';

		try {
			const result = await adminSettingsAPI.updateSettings(
				'diagnostic-logging',
				{
					ifMatch: loggingSettings.version,
					set: {
						'diagnostic-logging.sdk_ingest_enabled': enabled
					}
				},
				tenantId
			);

			loggingSettings = {
				...loggingSettings,
				version: result.newVersion,
				values: {
					...loggingSettings.values,
					'diagnostic-logging.sdk_ingest_enabled': enabled
				}
			};
			sdkIngestEnabled = enabled;
		} catch (err) {
			settingsError = err instanceof Error ? err.message : 'Failed to update diagnostic settings';
		} finally {
			settingsSaving = false;
		}
	}

	async function handleToggleMergedOutput(enabled: boolean) {
		if (!loggingSettings || settingsSaving) return;

		settingsSaving = true;
		settingsError = '';

		try {
			const result = await adminSettingsAPI.updateSettings(
				'diagnostic-logging',
				{
					ifMatch: loggingSettings.version,
					set: {
						'diagnostic-logging.merged_output_enabled': enabled
					}
				},
				tenantId
			);

			loggingSettings = {
				...loggingSettings,
				version: result.newVersion,
				values: {
					...loggingSettings.values,
					'diagnostic-logging.merged_output_enabled': enabled
				}
			};
			mergedOutputEnabled = enabled;
		} catch (err) {
			settingsError = err instanceof Error ? err.message : 'Failed to update diagnostic settings';
		} finally {
			settingsSaving = false;
		}
	}

	function validateDateRange() {
		if (startDate && endDate && startDate > endDate) {
			error = 'Start date must be before end date.';
			return false;
		}
		return true;
	}

	function toggleClientSelection(clientId: string, checked: boolean) {
		if (checked) {
			if (!selectedClientIds.includes(clientId)) {
				selectedClientIds = [...selectedClientIds, clientId];
			}
		} else {
			selectedClientIds = selectedClientIds.filter((id) => id !== clientId);
		}
	}

	async function handleExport(event?: Event) {
		event?.preventDefault();
		error = '';
		success = '';

		if (!tenantId) {
			error = 'Tenant ID is required.';
			return;
		}

		if (!validateDateRange()) {
			return;
		}

		loading = true;

		try {
			const params = new URLSearchParams({
				tenantId
			});

			if (selectedClientIds.length > 0) {
				params.append('clientIds', selectedClientIds.join(','));
			}
			if (startDate) params.append('startDate', startDate);
			if (endDate) params.append('endDate', endDate);
			if (sessionIds.trim()) params.append('sessionIds', sessionIds.trim());

			const selectedCategories = Object.entries(categories)
				.filter(([_, selected]) => selected)
				.map(([category]) => category);

			if (selectedCategories.length > 0) {
				params.append('categories', selectedCategories.join(','));
			}

			params.append('format', format);
			params.append('sortMode', sortMode);
			if (includeStats) params.append('includeStats', 'true');

			const response = await fetch(`/api/admin/diagnostic-logging/export?${params.toString()}`, {
				credentials: 'include'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Export failed: ${response.statusText}`);
			}

			const contentDisposition = response.headers.get('Content-Disposition');
			let filename = `diagnostic-logs-${tenantId}-${Date.now()}`;

			if (contentDisposition) {
				const match = contentDisposition.match(/filename="?(.+?)"?$/);
				if (match) filename = match[1];
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			success = `Successfully exported logs as ${filename}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to export logs';
		} finally {
			loading = false;
		}
	}

	function handleReset() {
		tenantId = settingsContext.tenantId || 'default';
		testTenantId = tenantId;
		selectedClientIds = [];
		sessionIds = '';
		categories = {
			'http-request': false,
			'http-response': false,
			'token-validation': true,
			'auth-decision': true
		};
		format = 'json';
		sortMode = 'timeline';
		includeStats = false;
		error = '';
		success = '';
	}

	async function handleTestConnection() {
		testError = '';
		testSuccess = '';
		testLatency = null;
		testLoading = true;

		try {
			const response = await fetch('/api/admin/diagnostic-logging/test-connection', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					tenantId: testTenantId || 'default',
					r2BucketBinding,
					pathPrefix
				})
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data.message || 'Connection test failed');
			}

			testSuccess = data.message || 'R2 connection successful';
			testLatency = typeof data.latencyMs === 'number' ? data.latencyMs : null;
		} catch (err) {
			testError = err instanceof Error ? err.message : 'Connection test failed';
		} finally {
			testLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Diagnostic Logging - Settings - Admin Dashboard - Authrim</title>
</svelte:head>

<div class="settings-detail-page diagnostic-logging-page">
	<div class="settings-detail-header">
		<a href="/admin/settings" class="back-link">
			<i class="i-ph-arrow-left"></i>
			Back to Settings
		</a>
		<div class="settings-header-row">
			<h1 class="page-title">Diagnostic Logging</h1>
			<span class="scope-badge tenant">🏢 Tenant</span>
		</div>
		<p class="page-description">
			Export diagnostic logs for OIDF conformance testing, debugging, and compliance audits.
		</p>
	</div>

	{#if error}
		<Alert variant="error" dismissible onDismiss={() => (error = '')}>
			{error}
		</Alert>
	{/if}

	{#if success}
		<Alert variant="success" dismissible onDismiss={() => (success = '')}>
			{success}
		</Alert>
	{/if}

	{#if settingsError}
		<Alert variant="error" dismissible onDismiss={() => (settingsError = '')}>
			{settingsError}
		</Alert>
	{/if}

	<form class="settings-form-card" onsubmit={handleExport}>
		<div class="card-section">
			<h2 class="card-title">Logging Status</h2>
			<p class="card-subtitle">Enable or disable diagnostic logging for this tenant.</p>
			<div class="toggle-row">
				<ToggleSwitch
					checked={loggingEnabled}
					disabled={!canEdit || settingsLoading || settingsSaving}
					label="Diagnostic logging"
					description={loggingEnabled ? 'Logging is enabled.' : 'Logging is disabled.'}
					onchange={handleToggleLogging}
				/>
				{#if settingsLoading}
					<span class="inline-muted">Loading...</span>
				{:else if settingsSaving}
					<span class="inline-muted">Saving...</span>
				{/if}
			</div>
		</div>
		<div class="card-section">
			<h3 class="card-title-sm">R2 Output</h3>
			<p class="card-subtitle">
				When enabled, logs are persisted to R2 for export. When disabled, logs are only emitted
				to console and exports return empty results.
			</p>
			<div class="toggle-row">
				<ToggleSwitch
					checked={r2OutputEnabled}
					disabled={!canEdit || settingsLoading || settingsSaving}
					label="Persist logs to R2"
					description={r2OutputEnabled ? 'R2 output is enabled.' : 'R2 output is disabled.'}
					onchange={handleToggleR2Output}
				/>
				{#if settingsLoading}
					<span class="inline-muted">Loading...</span>
				{:else if settingsSaving}
					<span class="inline-muted">Saving...</span>
				{/if}
			</div>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">SDK Log Ingestion</h3>
			<p class="card-subtitle">
				Accept diagnostic logs from client SDKs (Web, Node.js, etc.) via the public ingest API.
				Requires client_id authentication.
			</p>
			<div class="toggle-row">
				<ToggleSwitch
					checked={sdkIngestEnabled}
					disabled={!canEdit || settingsLoading || settingsSaving}
					label="Accept SDK logs"
					description={sdkIngestEnabled ? 'SDK ingestion is enabled.' : 'SDK ingestion is disabled.'}
					onchange={handleToggleSdkIngest}
				/>
				{#if settingsLoading}
					<span class="inline-muted">Loading...</span>
				{:else if settingsSaving}
					<span class="inline-muted">Saving...</span>
				{/if}
			</div>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Merged Log Output</h3>
			<p class="card-subtitle">
				Export server and SDK logs in a single merged timeline using diagnosticSessionId correlation.
				Useful for OIDF conformance testing and end-to-end debugging.
			</p>
			<div class="toggle-row">
				<ToggleSwitch
					checked={mergedOutputEnabled}
					disabled={!canEdit || settingsLoading || settingsSaving}
					label="Enable merged export"
					description={mergedOutputEnabled ? 'Merged output is enabled.' : 'Merged output is disabled.'}
					onchange={handleToggleMergedOutput}
				/>
				{#if settingsLoading}
					<span class="inline-muted">Loading...</span>
				{:else if settingsSaving}
					<span class="inline-muted">Saving...</span>
				{/if}
			</div>
		</div>

		<div class="card-section">
			<h2 class="card-title">Export Filters</h2>
			<p class="card-subtitle">Narrow the data set before downloading logs.</p>
		</div>

		<div class="card-section">
			<div class="form-grid">
				<div class="form-group">
					<label for="tenantId">Tenant ID</label>
					<input
						id="tenantId"
						class="settings-input"
						type="text"
						bind:value={tenantId}
						onchange={(event) => handleTenantChange(event.currentTarget.value)}
					/>
				</div>
			</div>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Date Range</h3>
			<p class="form-hint">Defaults to the last 7 days when left blank.</p>
			<div class="form-grid">
				<div class="form-group">
					<label for="startDate">Start date</label>
					<input id="startDate" class="settings-input" type="date" bind:value={startDate} />
				</div>
				<div class="form-group">
					<label for="endDate">End date</label>
					<input id="endDate" class="settings-input" type="date" bind:value={endDate} />
				</div>
			</div>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Clients</h3>
			<p class="form-hint">
				Select one or more clients to filter results. Leave blank to export all clients.
			</p>
			{#if clientsLoading}
				<p class="empty-state">Loading clients...</p>
			{:else if clientsError}
				<p class="empty-state">{clientsError}</p>
			{:else if clientOptions.length === 0}
				<p class="empty-state">No clients found for this tenant.</p>
			{:else}
				<div class="checkbox-grid">
					{#each clientOptions as client (client.id)}
						<label class="settings-checkbox-label">
							<input
								class="settings-checkbox"
								type="checkbox"
								checked={selectedClientIds.includes(client.id)}
								onchange={(event) =>
									toggleClientSelection(client.id, event.currentTarget.checked)}
							/>
							<span class="settings-checkbox-text">{client.name}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Session IDs</h3>
			<p class="form-hint">Comma-separated diagnosticSessionId values.</p>
			<textarea
				class="settings-textarea"
				rows="3"
				placeholder="session-123, session-456"
				bind:value={sessionIds}
			></textarea>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Categories</h3>
			<div class="checkbox-grid">
				<label class="settings-checkbox-label">
					<input class="settings-checkbox" type="checkbox" bind:checked={categories['http-request']} />
					<span class="settings-checkbox-text">HTTP Request</span>
				</label>
				<label class="settings-checkbox-label">
					<input class="settings-checkbox" type="checkbox" bind:checked={categories['http-response']} />
					<span class="settings-checkbox-text">HTTP Response</span>
				</label>
				<label class="settings-checkbox-label">
					<input
						class="settings-checkbox"
						type="checkbox"
						bind:checked={categories['token-validation']}
					/>
					<span class="settings-checkbox-text">Token Validation</span>
				</label>
				<label class="settings-checkbox-label">
					<input
						class="settings-checkbox"
						type="checkbox"
						bind:checked={categories['auth-decision']}
					/>
					<span class="settings-checkbox-text">Auth Decision</span>
				</label>
			</div>
		</div>

		<div class="card-section">
			<h3 class="card-title-sm">Format</h3>
			<div class="form-grid">
				<div class="form-group">
					<label for="format">Export format</label>
					<select id="format" class="settings-select" bind:value={format}>
						<option value="json">JSON (pretty)</option>
						<option value="jsonl">JSONL (streaming)</option>
						<option value="text">Text (grouped)</option>
					</select>
				</div>
				<div class="form-group">
					<label for="sortMode">Sort mode</label>
					<select id="sortMode" class="settings-select" bind:value={sortMode}>
						<option value="timeline">Timeline (mixed)</option>
						<option value="category">Category (grouped)</option>
						<option value="session">Session (grouped)</option>
					</select>
				</div>
				<div class="form-group">
					<label class="settings-checkbox-label">
						<input class="settings-checkbox" type="checkbox" bind:checked={includeStats} />
						<span class="settings-checkbox-text">Include statistics summary</span>
					</label>
				</div>
			</div>
		</div>

		<div class="settings-actions">
			<button class="btn btn-secondary" type="button" onclick={handleReset} disabled={loading}>
				Reset
			</button>
			<button class="btn btn-primary" type="submit" disabled={loading}>
				{#if loading}
					Exporting...
				{:else}
					Export Logs
				{/if}
			</button>
		</div>
	</form>

	<div class="settings-form-card">
		<div class="card-section">
			<h2 class="card-title">Storage Connection</h2>
			<p class="card-subtitle">Verify R2 connectivity before exporting large volumes.</p>
		</div>

		<div class="card-section">
			<div class="form-grid">
				<div class="form-group">
					<label for="testTenantId">Tenant ID</label>
					<input id="testTenantId" class="settings-input" type="text" bind:value={testTenantId} />
				</div>
				<div class="form-group">
					<label for="r2BucketBinding">R2 binding</label>
					<input
						id="r2BucketBinding"
						class="settings-input"
						type="text"
						bind:value={r2BucketBinding}
					/>
				</div>
				<div class="form-group">
					<label for="pathPrefix">Path prefix</label>
					<input id="pathPrefix" class="settings-input" type="text" bind:value={pathPrefix} />
				</div>
			</div>
		</div>

		{#if testError}
			<div class="card-section">
				<Alert variant="error" dismissible onDismiss={() => (testError = '')}>
					{testError}
				</Alert>
			</div>
		{/if}

		{#if testSuccess}
			<div class="card-section">
				<Alert variant="success" dismissible onDismiss={() => (testSuccess = '')}>
					{testSuccess}
					{#if testLatency !== null}
						<span class="inline-muted">({testLatency} ms)</span>
					{/if}
				</Alert>
			</div>
		{/if}

		<div class="settings-actions">
			<button class="btn btn-secondary" type="button" onclick={handleTestConnection} disabled={testLoading}>
				{#if testLoading}
					Testing...
				{:else}
					Test Connection
				{/if}
			</button>
		</div>
	</div>

	<div class="settings-form-card">
		<div class="card-section">
			<h2 class="card-title">Usage Notes</h2>
			<ul class="info-list">
				<li>Use diagnosticSessionId values for OIDF conformance submissions.</li>
				<li>JSONL is best for streaming pipelines and log aggregators.</li>
				<li>Include statistics for audit trails and compliance exports.</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.diagnostic-logging-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.card-section {
		padding: 16px 20px;
		border-top: 1px solid var(--border);
	}

	.card-section:first-child {
		border-top: none;
	}

	.card-title {
		margin: 0 0 4px 0;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.card-title-sm {
		margin: 0 0 6px 0;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.card-subtitle {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-top: 12px;
	}

	.form-grid {
		display: grid;
		gap: 16px;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.form-hint {
		margin: 0 0 12px 0;
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.settings-textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		background-color: var(--bg-card);
		color: var(--text-primary);
		resize: vertical;
		min-height: 90px;
	}

	.settings-textarea:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-light);
	}

	.checkbox-grid {
		display: grid;
		gap: 10px 16px;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.empty-state {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.inline-muted {
		color: var(--text-muted);
		margin-left: 6px;
	}

	.info-list {
		margin: 0;
		padding-left: 18px;
		color: var(--text-secondary);
		line-height: 1.6;
	}
</style>
