<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		adminReBACAPI,
		type RelationDefinition,
		formatRelationExpression,
		getExpressionTypeLabel
	} from '$lib/api/admin-rebac';

	// State
	let definitions: RelationDefinition[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		total_pages: 0
	});

	// Filters
	let filterObjectType = $state('');
	let filterSearch = $state('');
	let filterActive: 'all' | 'active' | 'inactive' = $state('all');

	// Create dialog state
	let showCreateDialog = $state(false);
	let creating = $state(false);
	let createError = $state('');
	let createForm = $state({
		object_type: '',
		relation_name: '',
		definition_type: 'direct' as 'direct' | 'union',
		direct_relation: '',
		description: '',
		priority: 0
	});

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let definitionToDelete: RelationDefinition | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	$effect(() => {
		const urlObjectType = $page.url.searchParams.get('object_type');
		if (urlObjectType) {
			filterObjectType = urlObjectType;
		}
	});

	async function loadDefinitions() {
		loading = true;
		error = '';

		try {
			const response = await adminReBACAPI.listDefinitions({
				page: pagination.page,
				limit: pagination.limit,
				object_type: filterObjectType || undefined,
				search: filterSearch || undefined,
				is_active: filterActive === 'all' ? undefined : filterActive === 'active'
			});

			definitions = response.definitions;
			pagination = response.pagination;
		} catch (err) {
			console.error('Failed to load relation definitions:', err);
			error = err instanceof Error ? err.message : 'Failed to load relation definitions';
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadDefinitions();
	}

	function clearFilters() {
		filterObjectType = '';
		filterSearch = '';
		filterActive = 'all';
		pagination.page = 1;
		loadDefinitions();
	}

	function goToPage(newPage: number) {
		if (newPage < 1 || newPage > pagination.total_pages) return;
		pagination.page = newPage;
		loadDefinitions();
	}

	function openCreateDialog() {
		createForm = {
			object_type: filterObjectType || '',
			relation_name: '',
			definition_type: 'direct',
			direct_relation: '',
			description: '',
			priority: 0
		};
		createError = '';
		showCreateDialog = true;
	}

	async function submitCreate() {
		if (!createForm.object_type || !createForm.relation_name) {
			createError = 'Object type and relation name are required';
			return;
		}

		creating = true;
		createError = '';

		try {
			let definition;
			if (createForm.definition_type === 'direct') {
				definition = {
					type: 'direct' as const,
					relation: createForm.direct_relation || createForm.relation_name
				};
			} else {
				// Simple union with direct relation
				definition = {
					type: 'union' as const,
					children: [
						{
							type: 'direct' as const,
							relation: createForm.relation_name
						}
					]
				};
			}

			await adminReBACAPI.createDefinition({
				object_type: createForm.object_type,
				relation_name: createForm.relation_name,
				definition,
				description: createForm.description || undefined,
				priority: createForm.priority
			});

			showCreateDialog = false;
			loadDefinitions();
		} catch (err) {
			console.error('Failed to create relation definition:', err);
			createError = err instanceof Error ? err.message : 'Failed to create relation definition';
		} finally {
			creating = false;
		}
	}

	function openDeleteDialog(def: RelationDefinition, event: Event) {
		event.stopPropagation();
		if (def.tenant_id === 'default') {
			return;
		}
		definitionToDelete = def;
		deleteError = '';
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!definitionToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminReBACAPI.deleteDefinition(definitionToDelete.id);
			showDeleteDialog = false;
			definitionToDelete = null;
			loadDefinitions();
		} catch (err) {
			console.error('Failed to delete relation definition:', err);
			deleteError = err instanceof Error ? err.message : 'Failed to delete relation definition';
		} finally {
			deleting = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	onMount(() => {
		loadDefinitions();
	});
</script>

<div class="definitions-page">
	<div class="page-header">
		<div class="header-content">
			<nav class="breadcrumb">
				<a href="/admin/rebac">ReBAC</a>
				<span>/</span>
				<span>Relation Definitions</span>
			</nav>
			<h1>Relation Definitions</h1>
			<p class="description">
				Configure how relations are computed using Zanzibar-style expressions.
			</p>
		</div>
		<button class="btn-primary" onclick={openCreateDialog}>+ Create Definition</button>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadDefinitions}>Retry</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="filter-bar">
		<input
			type="text"
			placeholder="Search..."
			bind:value={filterSearch}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<input
			type="text"
			placeholder="Object type"
			bind:value={filterObjectType}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<select bind:value={filterActive} onchange={applyFilters}>
			<option value="all">All Status</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
		<button class="btn-filter" onclick={applyFilters}>Apply</button>
		<button class="btn-clear" onclick={clearFilters}>Clear</button>
	</div>

	<!-- Definitions Table -->
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if definitions.length === 0}
		<div class="empty-state">
			<p>No relation definitions found.</p>
			<button class="btn-primary" onclick={openCreateDialog}>Create Definition</button>
		</div>
	{:else}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Object Type</th>
						<th>Relation</th>
						<th>Expression</th>
						<th>Priority</th>
						<th>Status</th>
						<th>Source</th>
						<th>Updated</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each definitions as def (def.id)}
						<tr>
							<td>
								<span class="object-type">{def.object_type}</span>
							</td>
							<td>
								<span class="relation-name">{def.relation_name}</span>
							</td>
							<td>
								<div class="expression">
									<span class="expr-type">{getExpressionTypeLabel(def.definition.type)}</span>
									<span class="expr-preview">{formatRelationExpression(def.definition)}</span>
								</div>
							</td>
							<td>{def.priority}</td>
							<td>
								<span
									class="status-badge"
									class:active={def.is_active}
									class:inactive={!def.is_active}
								>
									{def.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td>
								<span class="source-badge" class:default={def.tenant_id === 'default'}>
									{def.tenant_id === 'default' ? 'Default' : 'Custom'}
								</span>
							</td>
							<td>{formatDate(def.updated_at)}</td>
							<td class="actions">
								<a href="/admin/rebac/definitions/{def.id}" class="btn-action">View</a>
								{#if def.tenant_id !== 'default'}
									<button class="btn-action delete" onclick={(e) => openDeleteDialog(def, e)}>
										Delete
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if pagination.total_pages > 1}
			<div class="pagination">
				<button disabled={pagination.page === 1} onclick={() => goToPage(pagination.page - 1)}>
					Previous
				</button>
				<span class="page-info">
					Page {pagination.page} of {pagination.total_pages}
					<span class="total">({pagination.total} total)</span>
				</span>
				<button
					disabled={pagination.page === pagination.total_pages}
					onclick={() => goToPage(pagination.page + 1)}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="dialog-overlay" onclick={() => (showCreateDialog = false)}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Create Relation Definition</h2>

			{#if createError}
				<div class="dialog-error">{createError}</div>
			{/if}

			<div class="form-group">
				<label for="object-type">Object Type</label>
				<input
					id="object-type"
					type="text"
					bind:value={createForm.object_type}
					placeholder="document, folder, project..."
				/>
			</div>

			<div class="form-group">
				<label for="relation-name">Relation Name</label>
				<input
					id="relation-name"
					type="text"
					bind:value={createForm.relation_name}
					placeholder="viewer, editor, owner..."
				/>
			</div>

			<div class="form-group">
				<label for="def-type">Definition Type</label>
				<select id="def-type" bind:value={createForm.definition_type}>
					<option value="direct">Direct Relation</option>
					<option value="union">Union (OR)</option>
				</select>
			</div>

			{#if createForm.definition_type === 'direct'}
				<div class="form-group">
					<label for="direct-rel">Direct Relation</label>
					<input
						id="direct-rel"
						type="text"
						bind:value={createForm.direct_relation}
						placeholder="Leave empty to use relation name"
					/>
					<small>The actual relation to check in the database</small>
				</div>
			{/if}

			<div class="form-group">
				<label for="description">Description</label>
				<textarea
					id="description"
					bind:value={createForm.description}
					placeholder="Optional description..."
					rows="2"
				></textarea>
			</div>

			<div class="form-group">
				<label for="priority">Priority</label>
				<input id="priority" type="number" bind:value={createForm.priority} min="0" max="1000" />
				<small>Higher priority definitions are evaluated first</small>
			</div>

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showCreateDialog = false)}> Cancel </button>
				<button class="btn-primary" onclick={submitCreate} disabled={creating}>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && definitionToDelete}
	<div class="dialog-overlay" onclick={() => (showDeleteDialog = false)}>
		<div class="dialog dialog-small" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Relation Definition</h2>

			{#if deleteError}
				<div class="dialog-error">{deleteError}</div>
			{/if}

			<p>
				Are you sure you want to delete the relation definition
				<strong>{definitionToDelete.object_type}#{definitionToDelete.relation_name}</strong>?
			</p>
			<p class="warning-text">This action cannot be undone.</p>

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showDeleteDialog = false)}> Cancel </button>
				<button class="btn-danger" onclick={confirmDelete} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.definitions-page {
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #6b7280;
		margin-bottom: 8px;
	}

	.breadcrumb a {
		color: #3b82f6;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.page-header h1 {
		font-size: 24px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 8px 0;
	}

	.description {
		color: #6b7280;
		margin: 0;
	}

	.error-banner {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 12px 16px;
		margin-bottom: 24px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #b91c1c;
	}

	.error-banner button {
		background-color: #b91c1c;
		color: white;
		border: none;
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
	}

	/* Filters */
	.filter-bar {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.filter-bar input,
	.filter-bar select {
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
	}

	.filter-bar input {
		width: 180px;
	}

	.btn-filter,
	.btn-clear {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
	}

	.btn-filter {
		background-color: #3b82f6;
		color: white;
		border: none;
	}

	.btn-clear {
		background-color: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	/* Table */
	.table-container {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	th {
		background-color: #f9fafb;
		font-weight: 500;
		color: #374151;
		font-size: 13px;
		text-transform: uppercase;
	}

	td {
		font-size: 14px;
		color: #111827;
	}

	.object-type {
		font-weight: 600;
		color: #1e40af;
	}

	.relation-name {
		font-family: 'Monaco', 'Menlo', monospace;
		background-color: #f3f4f6;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.expression {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.expr-type {
		font-size: 12px;
		font-weight: 500;
		color: #6b7280;
	}

	.expr-preview {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 12px;
		color: #374151;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.status-badge.active {
		background-color: #dcfce7;
		color: #166534;
	}

	.status-badge.inactive {
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.source-badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		background-color: #dbeafe;
		color: #1e40af;
	}

	.source-badge.default {
		background-color: #f3e8ff;
		color: #6b21a8;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.btn-action {
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 13px;
		text-decoration: none;
		cursor: pointer;
		background-color: #f3f4f6;
		color: #374151;
		border: none;
	}

	.btn-action:hover {
		background-color: #e5e7eb;
	}

	.btn-action.delete {
		color: #b91c1c;
	}

	.btn-action.delete:hover {
		background-color: #fef2f2;
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
		margin-top: 24px;
	}

	.pagination button {
		padding: 8px 16px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		cursor: pointer;
	}

	.pagination button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		color: #374151;
	}

	.page-info .total {
		color: #6b7280;
	}

	.loading,
	.empty-state {
		text-align: center;
		padding: 60px;
		color: #6b7280;
	}

	.empty-state button {
		margin-top: 16px;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Dialog */
	.dialog-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.dialog {
		background: white;
		border-radius: 12px;
		padding: 24px;
		width: 500px;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-small {
		width: 400px;
	}

	.dialog h2 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 20px 0;
	}

	.dialog-error {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		padding: 10px 14px;
		margin-bottom: 16px;
		color: #b91c1c;
		font-size: 14px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: #374151;
		margin-bottom: 6px;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
		box-sizing: border-box;
	}

	.form-group small {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		color: #6b7280;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		padding: 10px 20px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background-color: #f9fafb;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.warning-text {
		color: #b91c1c;
		font-size: 14px;
	}
</style>
