<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminPluginsAPI,
		type PluginWithStatus,
		type PluginHealthResponse,
		getTrustLevelColor,
		getStabilityColor,
		getHealthStatusColor,
		PLUGIN_CATEGORIES
	} from '$lib/api/admin-plugins';

	let plugins: PluginWithStatus[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Filter state
	let filterCategory = $state('');
	let filterEnabled = $state<boolean | undefined>(undefined);

	// Detail dialog state
	let showDetailDialog = $state(false);
	let selectedPlugin: PluginWithStatus | null = $state(null);
	let pluginConfig: Record<string, unknown> = $state({});
	let loadingConfig = $state(false);

	// Health check state
	let healthStatus: Record<string, PluginHealthResponse> = $state({});
	let checkingHealth: Record<string, boolean> = $state({});

	async function loadPlugins() {
		loading = true;
		error = '';

		try {
			const params: { category?: string; enabled?: boolean } = {};
			if (filterCategory) params.category = filterCategory;
			if (filterEnabled !== undefined) params.enabled = filterEnabled;

			const response = await adminPluginsAPI.list(params);
			plugins = response.plugins;
		} catch (err) {
			console.error('Failed to load plugins:', err);
			error = 'Failed to load plugins';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadPlugins();
	});

	async function toggleEnabled(plugin: PluginWithStatus, event: Event) {
		event.stopPropagation();
		try {
			if (plugin.enabled) {
				await adminPluginsAPI.disable(plugin.id);
			} else {
				await adminPluginsAPI.enable(plugin.id);
			}
			await loadPlugins();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update plugin';
		}
	}

	async function checkHealth(plugin: PluginWithStatus, event: Event) {
		event.stopPropagation();
		checkingHealth = { ...checkingHealth, [plugin.id]: true };

		try {
			const result = await adminPluginsAPI.checkHealth(plugin.id);
			healthStatus = { ...healthStatus, [plugin.id]: result };
		} catch (err) {
			healthStatus = {
				...healthStatus,
				[plugin.id]: {
					status: 'unhealthy',
					message: err instanceof Error ? err.message : 'Health check failed'
				}
			};
		} finally {
			checkingHealth = { ...checkingHealth, [plugin.id]: false };
		}
	}

	async function openDetailDialog(plugin: PluginWithStatus) {
		selectedPlugin = plugin;
		pluginConfig = {};
		loadingConfig = true;
		showDetailDialog = true;

		try {
			const detail = await adminPluginsAPI.get(plugin.id);
			pluginConfig = detail.config;
		} catch (err) {
			console.error('Failed to load plugin config:', err);
		} finally {
			loadingConfig = false;
		}
	}

	function closeDetailDialog() {
		showDetailDialog = false;
		selectedPlugin = null;
		pluginConfig = {};
	}

	function applyFilters() {
		loadPlugins();
	}

	function clearFilters() {
		filterCategory = '';
		filterEnabled = undefined;
		loadPlugins();
	}

	function getSourceIcon(type: string): string {
		switch (type) {
			case 'builtin':
				return '📦';
			case 'npm':
				return '📥';
			case 'local':
				return '📁';
			default:
				return '❓';
		}
	}
</script>

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">Plugins</h1>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		Manage installed plugins to extend Authrim's functionality with custom authentication flows,
		event handlers, claims providers, and integrations.
	</p>

	<!-- Filters -->
	<div
		style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;"
	>
		<div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
			<div>
				<label
					style="display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;"
				>
					Category
				</label>
				<select
					bind:value={filterCategory}
					style="
						padding: 8px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						background: white;
						min-width: 150px;
					"
				>
					<option value="">All Categories</option>
					{#each PLUGIN_CATEGORIES as category (category.id)}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label
					style="display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;"
				>
					Status
				</label>
				<select
					bind:value={filterEnabled}
					style="
						padding: 8px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						background: white;
						min-width: 120px;
					"
				>
					<option value={undefined}>All</option>
					<option value={true}>Enabled</option>
					<option value={false}>Disabled</option>
				</select>
			</div>
			<button
				onclick={applyFilters}
				style="
					padding: 8px 16px;
					background-color: #3b82f6;
					color: white;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					font-size: 14px;
				"
			>
				Apply
			</button>
			<button
				onclick={clearFilters}
				style="
					padding: 8px 16px;
					background-color: #f3f4f6;
					color: #374151;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					font-size: 14px;
				"
			>
				Clear
			</button>
		</div>
	</div>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading...</div>
	{:else if plugins.length === 0}
		<div
			style="text-align: center; padding: 48px; color: #6b7280; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0;">No plugins found.</p>
			<p style="margin: 0; font-size: 14px;">
				{filterCategory || filterEnabled !== undefined
					? 'Try adjusting your filters.'
					: 'Plugins can be added via npm packages or local configuration.'}
			</p>
		</div>
	{:else}
		<div
			style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px;"
		>
			{#each plugins as plugin (plugin.id)}
				<div
					style="
						background: white;
						border-radius: 8px;
						border: 1px solid #e5e7eb;
						padding: 20px;
						cursor: pointer;
						transition: box-shadow 0.2s, border-color 0.2s;
					"
					onclick={() => openDetailDialog(plugin)}
					onkeydown={(e) => e.key === 'Enter' && openDetailDialog(plugin)}
					tabindex="0"
					role="button"
					onmouseenter={(e) => {
						e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
						e.currentTarget.style.borderColor = '#d1d5db';
					}}
					onmouseleave={(e) => {
						e.currentTarget.style.boxShadow = 'none';
						e.currentTarget.style.borderColor = '#e5e7eb';
					}}
				>
					<!-- Header -->
					<div
						style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;"
					>
						<div style="display: flex; align-items: center; gap: 10px;">
							{#if plugin.meta?.icon}
								<span style="font-size: 24px;">{plugin.meta.icon}</span>
							{:else}
								<span style="font-size: 24px;">🧩</span>
							{/if}
							<div>
								<h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0;">
									{plugin.meta?.name || plugin.id}
								</h3>
								<div style="display: flex; gap: 6px; margin-top: 4px;">
									<span
										style="
											font-size: 11px;
											padding: 2px 6px;
											border-radius: 4px;
											background-color: {getTrustLevelColor(plugin.trustLevel)}20;
											color: {getTrustLevelColor(plugin.trustLevel)};
											font-weight: 500;
										"
									>
										{plugin.trustLevel}
									</span>
									{#if plugin.meta?.stability}
										<span
											style="
												font-size: 11px;
												padding: 2px 6px;
												border-radius: 4px;
												background-color: {getStabilityColor(plugin.meta.stability)}20;
												color: {getStabilityColor(plugin.meta.stability)};
												font-weight: 500;
											"
										>
											{plugin.meta.stability}
										</span>
									{/if}
								</div>
							</div>
						</div>
						<button
							onclick={(e) => toggleEnabled(plugin, e)}
							style="
								padding: 4px 10px;
								border-radius: 9999px;
								font-size: 12px;
								font-weight: 500;
								border: none;
								cursor: pointer;
								{plugin.enabled
								? 'background-color: #d1fae5; color: #065f46;'
								: 'background-color: #e5e7eb; color: #374151;'}
							"
						>
							{plugin.enabled ? 'Enabled' : 'Disabled'}
						</button>
					</div>

					<!-- Description -->
					{#if plugin.meta?.description}
						<p style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0; line-height: 1.5;">
							{plugin.meta.description}
						</p>
					{/if}

					<!-- Metadata -->
					<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
						<span
							style="
								font-size: 12px;
								color: #6b7280;
								display: flex;
								align-items: center;
								gap: 4px;
							"
						>
							{getSourceIcon(plugin.source.type)}
							{plugin.source.type}
						</span>
						<span style="font-size: 12px; color: #6b7280;">
							v{plugin.version}
						</span>
						{#if plugin.meta?.category}
							<span
								style="
									font-size: 11px;
									padding: 2px 6px;
									border-radius: 4px;
									background-color: #f3f4f6;
									color: #374151;
								"
							>
								{plugin.meta.category}
							</span>
						{/if}
					</div>

					<!-- Capabilities -->
					{#if plugin.capabilities.length > 0}
						<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
							{#each plugin.capabilities as cap (cap)}
								<span
									style="
										font-size: 11px;
										padding: 2px 6px;
										border-radius: 4px;
										background-color: #dbeafe;
										color: #1e40af;
									"
								>
									{cap}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Health Status -->
					<div
						style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e5e7eb;"
					>
						{#if healthStatus[plugin.id]}
							<span
								style="
									font-size: 12px;
									display: flex;
									align-items: center;
									gap: 4px;
									color: {getHealthStatusColor(healthStatus[plugin.id].status)};
								"
							>
								<span
									style="width: 8px; height: 8px; border-radius: 50%; background-color: {getHealthStatusColor(
										healthStatus[plugin.id].status
									)};"
								></span>
								{healthStatus[plugin.id].status}
							</span>
						{:else if plugin.lastHealthCheck}
							<span
								style="
									font-size: 12px;
									display: flex;
									align-items: center;
									gap: 4px;
									color: {getHealthStatusColor(plugin.lastHealthCheck.status)};
								"
							>
								<span
									style="width: 8px; height: 8px; border-radius: 50%; background-color: {getHealthStatusColor(
										plugin.lastHealthCheck.status
									)};"
								></span>
								{plugin.lastHealthCheck.status}
							</span>
						{:else}
							<span style="font-size: 12px; color: #9ca3af;">No health data</span>
						{/if}
						<button
							onclick={(e) => checkHealth(plugin, e)}
							disabled={checkingHealth[plugin.id]}
							style="
								padding: 4px 10px;
								background-color: #f3f4f6;
								color: #374151;
								border: none;
								border-radius: 4px;
								cursor: pointer;
								font-size: 12px;
								opacity: {checkingHealth[plugin.id] ? 0.7 : 1};
							"
						>
							{checkingHealth[plugin.id] ? 'Checking...' : 'Check Health'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Detail Dialog -->
{#if showDetailDialog && selectedPlugin}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeDetailDialog}
		onkeydown={(e) => e.key === 'Escape' && closeDetailDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<div
				style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;"
			>
				<div style="display: flex; align-items: center; gap: 12px;">
					{#if selectedPlugin.meta?.icon}
						<span style="font-size: 32px;">{selectedPlugin.meta.icon}</span>
					{:else}
						<span style="font-size: 32px;">🧩</span>
					{/if}
					<div>
						<h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #1f2937;">
							{selectedPlugin.meta?.name || selectedPlugin.id}
						</h2>
						<div style="font-size: 14px; color: #6b7280;">
							v{selectedPlugin.version}
						</div>
					</div>
				</div>
				<button
					onclick={closeDetailDialog}
					style="
						padding: 4px 8px;
						background: none;
						border: none;
						cursor: pointer;
						font-size: 20px;
						color: #9ca3af;
					"
				>
					×
				</button>
			</div>

			{#if selectedPlugin.trustLevel === 'community'}
				<div
					style="padding: 12px; background-color: #fef3c7; border-radius: 6px; margin-bottom: 16px; font-size: 13px; color: #92400e;"
				>
					⚠️ This is a community plugin. Authrim does not guarantee its security, reliability, or
					compatibility.
				</div>
			{/if}

			{#if selectedPlugin.meta?.description}
				<p style="color: #6b7280; margin: 0 0 16px 0;">
					{selectedPlugin.meta.description}
				</p>
			{/if}

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
				<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
					<div style="font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">
						Source
					</div>
					<div style="font-size: 14px; color: #374151;">
						{getSourceIcon(selectedPlugin.source.type)}
						{selectedPlugin.source.type}
						{#if selectedPlugin.source.identifier}
							<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
								{selectedPlugin.source.identifier}
							</div>
						{/if}
					</div>
				</div>
				<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
					<div style="font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">
						Status
					</div>
					<div style="font-size: 14px; color: #374151;">
						{selectedPlugin.enabled ? '✓ Enabled' : '○ Disabled'}
					</div>
				</div>
			</div>

			{#if selectedPlugin.capabilities.length > 0}
				<div style="margin-bottom: 16px;">
					<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
						Capabilities
					</div>
					<div style="display: flex; flex-wrap: wrap; gap: 6px;">
						{#each selectedPlugin.capabilities as cap (cap)}
							<span
								style="
									font-size: 12px;
									padding: 4px 8px;
									border-radius: 4px;
									background-color: #dbeafe;
									color: #1e40af;
								"
							>
								{cap}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if selectedPlugin.meta?.author}
				<div style="margin-bottom: 16px;">
					<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
						Author
					</div>
					<div style="font-size: 14px; color: #6b7280;">
						{selectedPlugin.meta.author.name}
						{#if selectedPlugin.meta.author.url}
							<a
								href={selectedPlugin.meta.author.url}
								target="_blank"
								rel="noopener noreferrer"
								style="color: #3b82f6; margin-left: 8px;"
							>
								↗
							</a>
						{/if}
					</div>
				</div>
			{/if}

			{#if selectedPlugin.meta?.documentationUrl}
				<div style="margin-bottom: 16px;">
					<a
						href={selectedPlugin.meta.documentationUrl}
						target="_blank"
						rel="noopener noreferrer"
						style="
							display: inline-flex;
							align-items: center;
							gap: 6px;
							color: #3b82f6;
							font-size: 14px;
							text-decoration: none;
						"
					>
						📖 Documentation ↗
					</a>
				</div>
			{/if}

			<div style="margin-bottom: 16px;">
				<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
					Configuration
				</div>
				{#if loadingConfig}
					<div style="color: #6b7280; font-size: 14px;">Loading configuration...</div>
				{:else if Object.keys(pluginConfig).length === 0}
					<div style="color: #6b7280; font-size: 14px;">No configuration available.</div>
				{:else}
					<pre
						style="
							background: #f9fafb;
							padding: 12px;
							border-radius: 6px;
							font-size: 12px;
							overflow-x: auto;
							margin: 0;
						">{JSON.stringify(pluginConfig, null, 2)}</pre>
				{/if}
			</div>

			<div
				style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #e5e7eb;"
			>
				<button
					onclick={closeDetailDialog}
					style="
						padding: 10px 20px;
						background-color: #f3f4f6;
						color: #374151;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
					"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
