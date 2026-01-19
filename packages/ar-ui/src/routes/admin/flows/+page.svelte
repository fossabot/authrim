<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		adminFlowsAPI,
		type Flow,
		type ProfileId,
		getProfileDisplayName,
		getProfileBadgeClass,
		canDeleteFlow
	} from '$lib/api/admin-flows';

	let flows: Flow[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Pagination
	let page = $state(1);
	let limit = $state(20);
	let total = $state(0);
	let totalPages = $state(0);

	// Filter state
	let filterProfile: ProfileId | 'all' = $state('all');
	let filterActive: 'all' | 'active' | 'inactive' = $state('all');
	let searchQuery = $state('');

	// Delete confirmation dialog state
	let showDeleteDialog = $state(false);
	let flowToDelete: Flow | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	async function loadFlows() {
		loading = true;
		error = '';

		try {
			const response = await adminFlowsAPI.list({
				profile_id: filterProfile !== 'all' ? filterProfile : undefined,
				is_active: filterActive === 'all' ? undefined : filterActive === 'active',
				search: searchQuery || undefined,
				page,
				limit
			});
			flows = response.flows;
			total = response.pagination.total;
			totalPages = response.pagination.total_pages;
		} catch (err) {
			console.error('Failed to load flows:', err);
			error = 'Failed to load flows';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadFlows();
	});

	function handleSearch() {
		page = 1;
		loadFlows();
	}

	function handleFilterChange() {
		page = 1;
		loadFlows();
	}

	function navigateToFlow(flow: Flow) {
		goto(`/admin/flows/${flow.id}`);
	}

	function navigateToCreate() {
		goto('/admin/flows/new');
	}

	function openDeleteDialog(flow: Flow, event: Event) {
		event.stopPropagation();
		if (!canDeleteFlow(flow)) {
			return;
		}
		flowToDelete = flow;
		deleteError = '';
		showDeleteDialog = true;
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		flowToDelete = null;
		deleteError = '';
	}

	async function confirmDelete() {
		if (!flowToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminFlowsAPI.delete(flowToDelete.id);
			closeDeleteDialog();
			await loadFlows();
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete flow';
		} finally {
			deleting = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			page = newPage;
			loadFlows();
		}
	}
</script>

<svelte:head>
	<title>Flows - Admin Dashboard - Authrim</title>
</svelte:head>

<div class="admin-page">
	<!-- Page Header -->
	<div class="page-header">
		<div>
			<h1 class="page-title">Flows</h1>
			<p class="page-description">Manage authentication and authorization flows.</p>
		</div>
		<div class="page-actions">
			<button class="btn btn-primary" onclick={navigateToCreate}>
				<i class="i-ph-plus"></i>
				Create Flow
			</button>
		</div>
	</div>

	{#if error}
		<div class="alert alert-error">
			<span>{error}</span>
			<button class="btn btn-secondary btn-sm" onclick={loadFlows}>Retry</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="panel">
		<div class="filter-row">
			<div class="form-group" style="flex: 1;">
				<label for="search" class="form-label">Search</label>
				<div class="search-box">
					<input
						id="search"
						type="text"
						class="form-input"
						placeholder="Search flows..."
						bind:value={searchQuery}
						onkeypress={(e) => e.key === 'Enter' && handleSearch()}
					/>
					<button class="btn btn-secondary" onclick={handleSearch}>
						<i class="i-ph-magnifying-glass"></i>
					</button>
				</div>
			</div>

			<div class="form-group">
				<label for="profile-filter" class="form-label">Profile</label>
				<select
					id="profile-filter"
					class="form-select"
					bind:value={filterProfile}
					onchange={handleFilterChange}
				>
					<option value="all">All</option>
					<option value="human-basic">Human (Basic)</option>
					<option value="human-org">Human (Org)</option>
					<option value="ai-agent">AI Agent</option>
					<option value="iot-device">IoT Device</option>
				</select>
			</div>

			<div class="form-group">
				<label for="status-filter" class="form-label">Status</label>
				<select
					id="status-filter"
					class="form-select"
					bind:value={filterActive}
					onchange={handleFilterChange}
				>
					<option value="all">All</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</select>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="loading-state">
			<i class="i-ph-circle-notch loading-spinner"></i>
			<p>Loading flows...</p>
		</div>
	{:else if flows.length === 0}
		<div class="panel">
			<div class="empty-state">
				<p class="empty-state-description">No flows found.</p>
				<button class="btn btn-primary" onclick={navigateToCreate}>Create your first flow</button>
			</div>
		</div>
	{:else}
		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Profile</th>
						<th>Client</th>
						<th>Status</th>
						<th>Version</th>
						<th>Updated</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each flows as flow (flow.id)}
						<tr
							onclick={() => navigateToFlow(flow)}
							onkeydown={(e) => e.key === 'Enter' && navigateToFlow(flow)}
							tabindex="0"
							role="button"
						>
							<td>
								<div class="cell-primary">
									{flow.name}
									{#if flow.is_builtin}
										<span class="badge badge-info">Builtin</span>
									{/if}
								</div>
							</td>
							<td>
								<span class={getProfileBadgeClass(flow.profile_id)}>
									{getProfileDisplayName(flow.profile_id)}
								</span>
							</td>
							<td class="muted">
								{flow.client_id || 'Tenant Default'}
							</td>
							<td>
								<span class={flow.is_active ? 'badge badge-success' : 'badge badge-neutral'}>
									{flow.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="mono muted">{flow.version}</td>
							<td class="muted nowrap">{formatDate(flow.updated_at)}</td>
							<td class="text-right" onclick={(e) => e.stopPropagation()}>
								<div class="action-buttons">
									<button
										class="btn btn-secondary btn-sm"
										onclick={(e) => {
											e.stopPropagation();
											navigateToFlow(flow);
										}}
									>
										View
									</button>
									{#if canDeleteFlow(flow)}
										<button
											class="btn btn-danger btn-sm"
											onclick={(e) => openDeleteDialog(flow, e)}
										>
											Delete
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="btn btn-secondary btn-sm"
					disabled={page === 1}
					onclick={() => goToPage(page - 1)}
				>
					Previous
				</button>
				<span class="pagination-info">Page {page} of {totalPages} ({total} total)</span>
				<button
					class="btn btn-secondary btn-sm"
					disabled={page === totalPages}
					onclick={() => goToPage(page + 1)}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog && flowToDelete}
	<div
		class="modal-overlay"
		onclick={closeDeleteDialog}
		onkeydown={(e) => e.key === 'Escape' && closeDeleteDialog()}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-dialog-title"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<div class="modal-header">
				<h2 id="delete-dialog-title" class="modal-title">Delete Flow</h2>
			</div>

			<div class="modal-body">
				{#if deleteError}
					<div class="alert alert-error">{deleteError}</div>
				{/if}

				<p class="modal-description">
					Are you sure you want to delete the flow <strong>{flowToDelete.name}</strong>?
				</p>
				<p class="danger-text">This action cannot be undone.</p>
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={closeDeleteDialog} disabled={deleting}>
					Cancel
				</button>
				<button class="btn btn-danger" onclick={confirmDelete} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
