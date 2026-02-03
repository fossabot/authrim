<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	// Form state
	let tenantId = 'default';
	let clientId = '';
	let startDate = '';
	let endDate = '';
	let sessionIds = '';
	let categories = {
		'http-request': false,
		'http-response': false,
		'token-validation': true,
		'auth-decision': true
	};
	let format: 'json' | 'jsonl' | 'text' = 'json';
	let includeStats = false;
	let sortMode: 'category' | 'timeline' = 'timeline';

	// UI state
	let loading = false;
	let error = '';
	let success = '';

	// Set default date range (last 7 days)
	onMount(() => {
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		endDate = now.toISOString().split('T')[0];
		startDate = sevenDaysAgo.toISOString().split('T')[0];
	});

	async function handleExport() {
		error = '';
		success = '';
		loading = true;

		try {
			// Build query parameters
			const params = new URLSearchParams({
				tenantId
			});

			if (clientId) {
				params.append('clientId', clientId);
			}

			if (startDate) {
				params.append('startDate', startDate);
			}

			if (endDate) {
				params.append('endDate', endDate);
			}

			if (sessionIds.trim()) {
				params.append('sessionIds', sessionIds.trim());
			}

			// Add selected categories
			const selectedCategories = Object.entries(categories)
				.filter(([_, selected]) => selected)
				.map(([category]) => category);

			if (selectedCategories.length > 0) {
				params.append('categories', selectedCategories.join(','));
			}

			params.append('format', format);
			params.append('sortMode', sortMode);

			if (includeStats) {
				params.append('includeStats', 'true');
			}

			// Fetch from API
			const response = await fetch(`/api/admin/diagnostic-logging/export?${params.toString()}`, {
				credentials: 'include'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Export failed: ${response.statusText}`);
			}

			// Get filename from Content-Disposition header
			const contentDisposition = response.headers.get('Content-Disposition');
			let filename = `diagnostic-logs-${tenantId}-${Date.now()}`;

			if (contentDisposition) {
				const match = contentDisposition.match(/filename="?(.+?)"?$/);
				if (match) {
					filename = match[1];
				}
			}

			// Download file
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
		tenantId = 'default';
		clientId = '';
		sessionIds = '';
		categories = {
			'http-request': false,
			'http-response': false,
			'token-validation': true,
			'auth-decision': true
		};
		format = 'json';
		includeStats = false;
		sortMode = 'timeline';
		error = '';
		success = '';

		// Reset date range
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		endDate = now.toISOString().split('T')[0];
		startDate = sevenDaysAgo.toISOString().split('T')[0];
	}
</script>

<svelte:head>
	<title>Diagnostic Logs Export - Authrim Admin</title>
</svelte:head>

<div class="container">
	<div class="header">
		<h1>Diagnostic Logs Export</h1>
		<p class="subtitle">
			Export diagnostic logs for OIDF conformance testing, debugging, and compliance audits
		</p>
	</div>

	<div class="card">
		<form on:submit|preventDefault={handleExport}>
			<!-- Tenant & Client ID -->
			<div class="form-section">
				<h2>Target</h2>
				<div class="form-row">
					<div class="form-group">
						<label for="tenantId">
							Tenant ID <span class="required">*</span>
						</label>
						<input
							id="tenantId"
							type="text"
							bind:value={tenantId}
							required
							placeholder="default"
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="clientId">
							Client ID <span class="optional">(optional)</span>
						</label>
						<input
							id="clientId"
							type="text"
							bind:value={clientId}
							placeholder="Leave empty for all clients"
							disabled={loading}
						/>
					</div>
				</div>
			</div>

			<!-- Date Range -->
			<div class="form-section">
				<h2>Date Range</h2>
				<div class="form-row">
					<div class="form-group">
						<label for="startDate">Start Date</label>
						<input id="startDate" type="date" bind:value={startDate} disabled={loading} />
					</div>

					<div class="form-group">
						<label for="endDate">End Date</label>
						<input id="endDate" type="date" bind:value={endDate} disabled={loading} />
					</div>
				</div>
				<p class="help-text">Default: Last 7 days</p>
			</div>

			<!-- Session IDs -->
			<div class="form-section">
				<h2>Session Filter</h2>
				<div class="form-group">
					<label for="sessionIds">
						Session IDs <span class="optional">(optional)</span>
					</label>
					<input
						id="sessionIds"
						type="text"
						bind:value={sessionIds}
						placeholder="Comma-separated session IDs (e.g., 550e8400-e29b-41d4-a716-446655440000)"
						disabled={loading}
					/>
					<p class="help-text">Leave empty to export all sessions</p>
				</div>
			</div>

			<!-- Categories -->
			<div class="form-section">
				<h2>Log Categories</h2>
				<div class="checkbox-group">
					<label class="checkbox">
						<input type="checkbox" bind:checked={categories['http-request']} disabled={loading} />
						<span>HTTP Request</span>
					</label>
					<label class="checkbox">
						<input type="checkbox" bind:checked={categories['http-response']} disabled={loading} />
						<span>HTTP Response</span>
					</label>
					<label class="checkbox">
						<input
							type="checkbox"
							bind:checked={categories['token-validation']}
							disabled={loading}
						/>
						<span>Token Validation</span>
					</label>
					<label class="checkbox">
						<input type="checkbox" bind:checked={categories['auth-decision']} disabled={loading} />
						<span>Auth Decision</span>
					</label>
				</div>
			</div>

			<!-- Format & Options -->
			<div class="form-section">
				<h2>Export Options</h2>
				<div class="form-row">
					<div class="form-group">
						<label for="format">Output Format</label>
						<select id="format" bind:value={format} disabled={loading}>
							<option value="json">JSON (pretty-printed)</option>
							<option value="jsonl">JSONL (line-delimited)</option>
							<option value="text">Text (human-readable)</option>
						</select>
					</div>

					<div class="form-group">
						<label for="sortMode">Sort Order</label>
						<select id="sortMode" bind:value={sortMode} disabled={loading}>
							<option value="category">By Category (time-ordered within category)</option>
							<option value="timeline">Timeline (all categories mixed)</option>
						</select>
					</div>

					<div class="form-group">
						<label class="checkbox">
							<input type="checkbox" bind:checked={includeStats} disabled={loading} />
							<span>Include Statistics</span>
						</label>
						<p class="help-text">Add log statistics (JSON format only)</p>
					</div>
				</div>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="icon"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
					<span>{error}</span>
				</div>
			{/if}

			{#if success}
				<div class="alert alert-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="icon"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{success}</span>
				</div>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn btn-secondary" on:click={handleReset} disabled={loading}>
					Reset
				</button>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
						Exporting...
					{:else}
						Export Logs
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Info Section -->
	<div class="info-section">
		<h3>ℹ️ Usage Information</h3>
		<ul>
			<li>
				<strong>OIDF Conformance Testing:</strong> Export logs with diagnosticSessionId for submission
			</li>
			<li><strong>Debugging:</strong> Export specific time ranges or sessions for troubleshooting</li>
			<li><strong>Compliance Audits:</strong> Export complete logs with statistics for audit trails</li>
		</ul>

		<h3>📋 Format Descriptions</h3>
		<ul>
			<li><strong>JSON:</strong> Pretty-printed JSON with optional statistics</li>
			<li><strong>JSONL:</strong> One JSON object per line (ideal for streaming processing)</li>
			<li><strong>Text:</strong> Human-readable format grouped by session</li>
		</ul>
	</div>
</div>

<style>
	.container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
	}

	.card {
		background: white;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.form-section:last-of-type {
		border-bottom: none;
		margin-bottom: 1.5rem;
		padding-bottom: 0;
	}

	.form-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.required {
		color: #ef4444;
	}

	.optional {
		color: #9ca3af;
		font-weight: 400;
	}

	input[type='text'],
	input[type='date'],
	select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	input[type='text']:focus,
	input[type='date']:focus,
	select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	input:disabled,
	select:disabled {
		background-color: #f3f4f6;
		cursor: not-allowed;
	}

	.help-text {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.checkbox-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.checkbox span {
		font-size: 0.875rem;
		color: #374151;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.375rem;
		margin-bottom: 1.5rem;
	}

	.alert-error {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.alert-success {
		background-color: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}

	.icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #f9fafb;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.info-section {
		background-color: #f9fafb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
	}

	.info-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.75rem 0;
	}

	.info-section h3:not(:first-child) {
		margin-top: 1.5rem;
	}

	.info-section ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.info-section li {
		margin-bottom: 0.5rem;
	}
</style>
