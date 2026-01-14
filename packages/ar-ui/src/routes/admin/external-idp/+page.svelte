<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		adminExternalProvidersAPI,
		type ExternalIdPProvider,
		PROVIDER_TEMPLATES
	} from '$lib/api/admin-external-providers';

	let providers: ExternalIdPProvider[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Delete confirmation dialog state
	let showDeleteDialog = $state(false);
	let providerToDelete: ExternalIdPProvider | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	async function loadProviders() {
		loading = true;
		error = '';

		try {
			const response = await adminExternalProvidersAPI.list();
			providers = response.providers;
		} catch (err) {
			console.error('Failed to load external IdP providers:', err);
			error = 'Failed to load external IdP providers';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadProviders();
	});

	function navigateToProvider(id: string) {
		goto(`/admin/external-idp/${id}`);
	}

	function navigateToNew() {
		goto('/admin/external-idp/new');
	}

	function openDeleteDialog(provider: ExternalIdPProvider, event: Event) {
		event.stopPropagation();
		providerToDelete = provider;
		deleteError = '';
		showDeleteDialog = true;
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		providerToDelete = null;
		deleteError = '';
	}

	async function confirmDelete() {
		if (!providerToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminExternalProvidersAPI.delete(providerToDelete.id);
			showDeleteDialog = false;
			providerToDelete = null;
			await loadProviders();
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete provider';
		} finally {
			deleting = false;
		}
	}

	function getProviderTypeBadgeStyle(type: 'oidc' | 'oauth2'): string {
		if (type === 'oidc') {
			return 'background-color: #dbeafe; color: #1e40af;'; // Blue
		}
		return 'background-color: #e0e7ff; color: #3730a3;'; // Indigo
	}

	function getStatusBadgeStyle(enabled: boolean): string {
		if (enabled) {
			return 'background-color: #d1fae5; color: #065f46;'; // Green
		}
		return 'background-color: #e5e7eb; color: #374151;'; // Gray
	}

	function getTemplateInfo(slug: string | undefined): string {
		if (!slug) return '';
		const template = PROVIDER_TEMPLATES.find((t) => t.id === slug);
		return template?.name || '';
	}
</script>

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
			External Identity Providers
		</h1>
		<button
			onclick={navigateToNew}
			style="
				padding: 10px 20px;
				background-color: #3b82f6;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
			"
		>
			Add Provider
		</button>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		Configure external identity providers for social login and enterprise SSO (Google, GitHub,
		Microsoft, etc.)
	</p>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading...</div>
	{:else if providers.length === 0}
		<div
			style="text-align: center; padding: 48px; color: #6b7280; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0;">No external identity providers configured.</p>
			<p style="margin: 0 0 24px 0; font-size: 14px;">
				Add a provider to enable social login or enterprise SSO for your users.
			</p>
			<button
				onclick={navigateToNew}
				style="
					padding: 10px 20px;
					background-color: #3b82f6;
					color: white;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					font-size: 14px;
				"
			>
				Add Your First Provider
			</button>
		</div>
	{:else}
		<div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
			<table style="width: 100%; border-collapse: collapse;">
				<thead>
					<tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Name
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Type
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Status
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Priority
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Client ID
						</th>
						<th
							style="text-align: right; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{#each providers as provider (provider.id)}
						<tr
							style="border-bottom: 1px solid #e5e7eb; cursor: pointer;"
							onclick={() => navigateToProvider(provider.id)}
							onkeydown={(e) => e.key === 'Enter' && navigateToProvider(provider.id)}
							tabindex="0"
							role="button"
						>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<div style="display: flex; align-items: center; gap: 8px;">
									{#if provider.iconUrl}
										<img
											src={provider.iconUrl}
											alt=""
											style="width: 20px; height: 20px; border-radius: 4px;"
										/>
									{/if}
									<div>
										<div style="font-weight: 500; color: #1f2937;">{provider.name}</div>
										{#if provider.slug}
											<div style="font-size: 12px; color: #6b7280;">
												{getTemplateInfo(provider.slug) || provider.slug}
											</div>
										{/if}
									</div>
								</div>
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<span
									style="
										display: inline-block;
										padding: 4px 8px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										{getProviderTypeBadgeStyle(provider.providerType)}
									"
								>
									{provider.providerType.toUpperCase()}
								</span>
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<span
									style="
										display: inline-block;
										padding: 4px 8px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										{getStatusBadgeStyle(provider.enabled)}
									"
								>
									{provider.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								{provider.priority}
							</td>
							<td
								style="padding: 12px 16px; font-size: 14px; font-family: monospace; color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
							>
								{provider.clientId}
							</td>
							<td
								style="padding: 12px 16px; text-align: right;"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
								role="none"
							>
								<button
									onclick={(e) => openDeleteDialog(provider, e)}
									style="
										padding: 6px 12px;
										background-color: #fee2e2;
										color: #dc2626;
										border: none;
										border-radius: 4px;
										cursor: pointer;
										font-size: 13px;
									"
								>
									Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog && providerToDelete}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeDeleteDialog}
		onkeydown={(e) => e.key === 'Escape' && closeDeleteDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;">
				Delete External IdP Provider
			</h2>

			{#if deleteError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{deleteError}
				</div>
			{/if}

			<p style="color: #6b7280; margin: 0 0 16px 0;">
				Are you sure you want to delete this external IdP provider? This action cannot be undone and
				users will no longer be able to sign in with this provider.
			</p>

			<div
				style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 24px;"
			>
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
					<strong>Provider:</strong>
					{providerToDelete.name}
				</p>
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
					<strong>Type:</strong>
					{providerToDelete.providerType.toUpperCase()}
				</p>
				<p style="margin: 0; font-size: 14px; color: #374151;">
					<strong>Client ID:</strong>
					<code style="color: #1f2937;">{providerToDelete.clientId}</code>
				</p>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeDeleteDialog}
					disabled={deleting}
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
					Cancel
				</button>
				<button
					onclick={confirmDelete}
					disabled={deleting}
					style="
						padding: 10px 20px;
						background-color: #dc2626;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {deleting ? 0.7 : 1};
					"
				>
					{deleting ? 'Deleting...' : 'Delete Provider'}
				</button>
			</div>
		</div>
	</div>
{/if}
