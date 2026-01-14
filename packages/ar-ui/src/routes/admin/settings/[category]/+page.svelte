<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminSettingsAPI,
		isInternalSetting,
		SettingsConflictError,
		convertPatchesToAPIRequest,
		type CategorySettings,
		type CategoryMetaFull,
		type SettingMetaItem,
		type UIPatch,
		type SettingSource,
		type CategoryName
	} from '$lib/api/admin-settings';

	interface PageData {
		category: CategoryName;
	}

	let { data }: { data: PageData } = $props();

	// State
	let meta = $state<CategoryMetaFull | null>(null);
	let settings = $state<CategorySettings | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let successMessage = $state('');

	// Track pending changes
	let pendingPatches = $state<UIPatch[]>([]);

	// Derived: Check if there are unsaved changes
	const hasChanges = $derived(pendingPatches.length > 0);

	// Load data on mount
	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = '';
		pendingPatches = [];

		try {
			// Fetch meta and settings in parallel
			const [metaResult, settingsResult] = await Promise.all([
				adminSettingsAPI.getMeta(data.category),
				adminSettingsAPI.getSettings(data.category)
			]);

			meta = metaResult;
			settings = settingsResult;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
		} finally {
			loading = false;
		}
	}

	// Get current value (considering pending patches)
	function getCurrentValue(key: string): unknown {
		// Check pending patches first
		const patch = pendingPatches.find((p) => p.key === key);
		if (patch) {
			if (patch.op === 'set') return patch.value;
			if (patch.op === 'disable') return false;
			if (patch.op === 'clear') return settings?.values[key]; // Will revert to default
		}
		return settings?.values[key];
	}

	// Check if a setting is locked by environment variable
	function isLockedByEnv(key: string): boolean {
		return settings?.sources[key] === 'env';
	}

	// Check if a setting is locked (by env OR by internal visibility)
	function isSettingLocked(key: string, settingMeta: SettingMetaItem): boolean {
		// Locked if set by environment variable
		if (isLockedByEnv(key)) return true;
		// Locked if visibility is 'internal' (setup-time only settings)
		if (isInternalSetting(settingMeta)) return true;
		return false;
	}

	// Get source badge text and style
	function getSourceBadge(key: string): { text: string; bg: string; color: string } {
		const source = settings?.sources[key] as SettingSource;
		switch (source) {
			case 'env':
				return { text: 'env', bg: '#fef3c7', color: '#92400e' };
			case 'kv':
				return { text: 'kv', bg: '#dbeafe', color: '#1e40af' };
			default:
				return { text: 'default', bg: '#f3f4f6', color: '#6b7280' };
		}
	}

	// Handle value change
	function handleChange(key: string, value: unknown) {
		// Remove any existing patch for this key
		pendingPatches = pendingPatches.filter((p) => p.key !== key);

		// Only add patch if value differs from original
		const originalValue = settings?.values[key];
		if (value !== originalValue) {
			pendingPatches = [...pendingPatches, { op: 'set', key, value }];
		}
	}

	// Discard all changes
	function discardChanges() {
		pendingPatches = [];
	}

	// Save changes
	async function saveChanges() {
		if (!settings || pendingPatches.length === 0) return;

		saving = true;
		error = '';
		successMessage = '';

		try {
			const patchData = convertPatchesToAPIRequest(pendingPatches);
			const result = await adminSettingsAPI.updateSettings(data.category, {
				ifMatch: settings.version,
				...patchData
			});

			// Clear pending patches
			pendingPatches = [];

			// Show success message
			const appliedCount = result.applied.length + result.cleared.length + result.disabled.length;
			successMessage = `Successfully updated ${appliedCount} setting${appliedCount !== 1 ? 's' : ''}`;

			// Reload data to get updated version
			await loadData();

			// Clear success message after 3 seconds
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (err) {
			if (err instanceof SettingsConflictError) {
				error = `Settings were modified by another user. Please reload and try again.`;
			} else {
				error = err instanceof Error ? err.message : 'Failed to save settings';
			}
		} finally {
			saving = false;
		}
	}

	// Render input based on setting type
	function getInputType(settingMeta: SettingMetaItem): string {
		switch (settingMeta.type) {
			case 'number':
			case 'duration':
				return 'number';
			case 'boolean':
				return 'checkbox';
			default:
				return 'text';
		}
	}
</script>

<div>
	<!-- Back link and header -->
	<div style="margin-bottom: 24px;">
		<a
			href="/admin/settings"
			style="color: #3b82f6; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;"
		>
			← Back to Settings
		</a>
		{#if meta}
			<h1 style="font-size: 24px; font-weight: bold; color: #111827; margin: 8px 0 4px 0;">
				{meta.label}
			</h1>
			<p style="color: #6b7280; margin: 0;">
				{meta.description}
			</p>
		{/if}
	</div>

	<!-- Error message -->
	{#if error}
		<div
			style="background-color: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 12px; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
			{#if error.includes('another user')}
				<button
					onclick={loadData}
					style="margin-left: 12px; padding: 4px 8px; background-color: #b91c1c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
				>
					Reload
				</button>
			{/if}
		</div>
	{/if}

	<!-- Success message -->
	{#if successMessage}
		<div
			style="background-color: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 12px; border-radius: 6px; margin-bottom: 16px;"
		>
			{successMessage}
		</div>
	{/if}

	{#if loading}
		<div style="display: flex; justify-content: center; padding: 48px;">
			<p style="color: #6b7280;">Loading settings...</p>
		</div>
	{:else if meta && settings}
		<!-- Settings form -->
		<div
			style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;"
		>
			{#each Object.entries(meta.settings) as [key, settingMeta], index (key)}
				{@const value = getCurrentValue(key)}
				{@const locked = isSettingLocked(key, settingMeta)}
				{@const sourceBadge = getSourceBadge(key)}
				{@const hasPendingChange = pendingPatches.some((p) => p.key === key)}
				<div
					style="
						padding: 16px 20px;
						{index > 0 ? 'border-top: 1px solid #e5e7eb;' : ''}
						{hasPendingChange ? 'background-color: #fefce8;' : ''}
					"
				>
					<div
						style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;"
					>
						<div style="flex: 1;">
							<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
								<label for={key} style="font-weight: 500; color: #111827; font-size: 14px;">
									{settingMeta.label}
								</label>
								<span
									style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background-color: {sourceBadge.bg}; color: {sourceBadge.color};"
								>
									{sourceBadge.text}
								</span>
								{#if locked}
									<span style="font-size: 12px; color: #92400e;">🔒 Locked</span>
								{/if}
								{#if hasPendingChange}
									<span style="font-size: 12px; color: #ca8a04;">● Modified</span>
								{/if}
							</div>
							<p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
								{settingMeta.description}
								{#if settingMeta.unit}
									<span style="color: #9ca3af;">({settingMeta.unit})</span>
								{/if}
							</p>
						</div>

						<div style="flex-shrink: 0; min-width: 200px;">
							{#if settingMeta.type === 'boolean'}
								<label
									style="display: flex; align-items: center; gap: 8px; cursor: {locked
										? 'not-allowed'
										: 'pointer'};"
								>
									<input
										type="checkbox"
										id={key}
										checked={Boolean(value)}
										disabled={locked}
										onchange={(e) => handleChange(key, e.currentTarget.checked)}
										style="width: 18px; height: 18px; cursor: inherit;"
									/>
									<span style="font-size: 14px; color: {locked ? '#9ca3af' : '#374151'};">
										{value ? 'Enabled' : 'Disabled'}
									</span>
								</label>
							{:else if settingMeta.type === 'enum' && settingMeta.enum}
								<select
									id={key}
									value={String(value)}
									disabled={locked}
									onchange={(e) => handleChange(key, e.currentTarget.value)}
									style="
										width: 100%;
										padding: 8px 12px;
										border: 1px solid #d1d5db;
										border-radius: 6px;
										font-size: 14px;
										background-color: {locked ? '#f3f4f6' : 'white'};
										color: {locked ? '#9ca3af' : '#374151'};
										cursor: {locked ? 'not-allowed' : 'pointer'};
									"
								>
									{#each settingMeta.enum as option (option)}
										<option value={option}>{option}</option>
									{/each}
								</select>
							{:else}
								<input
									type={getInputType(settingMeta)}
									id={key}
									value={String(value ?? '')}
									disabled={locked}
									min={settingMeta.min}
									max={settingMeta.max}
									oninput={(e) => {
										const inputValue =
											settingMeta.type === 'number' || settingMeta.type === 'duration'
												? Number(e.currentTarget.value)
												: e.currentTarget.value;
										handleChange(key, inputValue);
									}}
									style="
										width: 100%;
										padding: 8px 12px;
										border: 1px solid #d1d5db;
										border-radius: 6px;
										font-size: 14px;
										background-color: {locked ? '#f3f4f6' : 'white'};
										color: {locked ? '#9ca3af' : '#374151'};
										cursor: {locked ? 'not-allowed' : 'auto'};
									"
								/>
							{/if}
							{#if settingMeta.min !== undefined || settingMeta.max !== undefined}
								<p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0 0;">
									{#if settingMeta.min !== undefined && settingMeta.max !== undefined}
										Range: {settingMeta.min} - {settingMeta.max}
									{:else if settingMeta.min !== undefined}
										Min: {settingMeta.min}
									{:else if settingMeta.max !== undefined}
										Max: {settingMeta.max}
									{/if}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Action buttons -->
		<div
			style="
				display: flex;
				justify-content: flex-end;
				gap: 12px;
				margin-top: 20px;
				padding: 16px 20px;
				background-color: #f9fafb;
				border: 1px solid #e5e7eb;
				border-radius: 8px;
			"
		>
			<button
				onclick={discardChanges}
				disabled={!hasChanges || saving}
				style="
					padding: 10px 20px;
					background-color: white;
					color: {hasChanges ? '#374151' : '#9ca3af'};
					border: 1px solid {hasChanges ? '#d1d5db' : '#e5e7eb'};
					border-radius: 6px;
					font-size: 14px;
					cursor: {hasChanges && !saving ? 'pointer' : 'not-allowed'};
				"
			>
				Discard Changes
			</button>
			<button
				onclick={saveChanges}
				disabled={!hasChanges || saving}
				style="
					padding: 10px 20px;
					background-color: {hasChanges ? '#3b82f6' : '#9ca3af'};
					color: white;
					border: none;
					border-radius: 6px;
					font-size: 14px;
					cursor: {hasChanges && !saving ? 'pointer' : 'not-allowed'};
				"
			>
				{saving ? 'Saving...' : `Save Changes${hasChanges ? ` (${pendingPatches.length})` : ''}`}
			</button>
		</div>
	{/if}
</div>
