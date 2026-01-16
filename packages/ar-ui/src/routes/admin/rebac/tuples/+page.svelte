<script lang="ts">
	import { onMount } from 'svelte';
	import { adminReBACAPI, type RelationshipTuple, formatTupleString } from '$lib/api/admin-rebac';

	// State
	let tuples: RelationshipTuple[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		total_pages: 0
	});

	// Filters
	let filterFromId = $state('');
	let filterToType = $state('');
	let filterToId = $state('');
	let filterRelationType = $state('');

	// Create dialog state
	let showCreateDialog = $state(false);
	let creating = $state(false);
	let createError = $state('');
	let createForm = $state({
		relationship_type: '',
		from_type: 'subject',
		from_id: '',
		to_type: '',
		to_id: '',
		permission_level: 'full',
		has_expiry: false,
		expires_at: ''
	});

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let tupleToDelete: RelationshipTuple | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	async function loadTuples() {
		loading = true;
		error = '';

		try {
			const response = await adminReBACAPI.listTuples({
				page: pagination.page,
				limit: pagination.limit,
				from_id: filterFromId || undefined,
				to_type: filterToType || undefined,
				to_id: filterToId || undefined,
				relationship_type: filterRelationType || undefined
			});

			tuples = response.tuples;
			pagination = response.pagination;
		} catch (err) {
			console.error('Failed to load relationship tuples:', err);
			error = err instanceof Error ? err.message : 'Failed to load relationship tuples';
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadTuples();
	}

	function clearFilters() {
		filterFromId = '';
		filterToType = '';
		filterToId = '';
		filterRelationType = '';
		pagination.page = 1;
		loadTuples();
	}

	function goToPage(newPage: number) {
		if (newPage < 1 || newPage > pagination.total_pages) return;
		pagination.page = newPage;
		loadTuples();
	}

	function openCreateDialog() {
		createForm = {
			relationship_type: '',
			from_type: 'subject',
			from_id: '',
			to_type: '',
			to_id: '',
			permission_level: 'full',
			has_expiry: false,
			expires_at: ''
		};
		createError = '';
		showCreateDialog = true;
	}

	async function submitCreate() {
		if (
			!createForm.relationship_type ||
			!createForm.from_id ||
			!createForm.to_type ||
			!createForm.to_id
		) {
			createError = 'All required fields must be filled';
			return;
		}

		creating = true;
		createError = '';

		try {
			await adminReBACAPI.createTuple({
				relationship_type: createForm.relationship_type,
				from_type: createForm.from_type,
				from_id: createForm.from_id,
				to_type: createForm.to_type,
				to_id: createForm.to_id,
				permission_level: createForm.permission_level,
				expires_at:
					createForm.has_expiry && createForm.expires_at
						? new Date(createForm.expires_at).getTime()
						: undefined
			});

			showCreateDialog = false;
			loadTuples();
		} catch (err) {
			console.error('Failed to create relationship tuple:', err);
			createError = err instanceof Error ? err.message : 'Failed to create relationship tuple';
		} finally {
			creating = false;
		}
	}

	function openDeleteDialog(tuple: RelationshipTuple, event: Event) {
		event.stopPropagation();
		tupleToDelete = tuple;
		deleteError = '';
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!tupleToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminReBACAPI.deleteTuple(tupleToDelete.id);
			showDeleteDialog = false;
			tupleToDelete = null;
			loadTuples();
		} catch (err) {
			console.error('Failed to delete relationship tuple:', err);
			deleteError = err instanceof Error ? err.message : 'Failed to delete relationship tuple';
		} finally {
			deleting = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isExpired(tuple: RelationshipTuple): boolean {
		if (!tuple.expires_at) return false;
		return tuple.expires_at < Date.now();
	}

	onMount(() => {
		loadTuples();
	});
</script>

<div class="tuples-page">
	<div class="page-header">
		<div class="header-content">
			<nav class="breadcrumb">
				<a href="/admin/rebac">ReBAC</a>
				<span>/</span>
				<span>Relationship Tuples</span>
			</nav>
			<h1>Relationship Tuples</h1>
			<p class="description">
				Manage user-relation-object assignments (Zanzibar notation: object#relation@user).
			</p>
		</div>
		<button class="btn-primary" onclick={openCreateDialog}>+ Create Tuple</button>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadTuples}>Retry</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="filter-bar">
		<input
			type="text"
			placeholder="From ID (user)"
			bind:value={filterFromId}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<input
			type="text"
			placeholder="To Type (object type)"
			bind:value={filterToType}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<input
			type="text"
			placeholder="To ID (object ID)"
			bind:value={filterToId}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<input
			type="text"
			placeholder="Relation Type"
			bind:value={filterRelationType}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<button class="btn-filter" onclick={applyFilters}>Apply</button>
		<button class="btn-clear" onclick={clearFilters}>Clear</button>
	</div>

	<!-- Tuples Table -->
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if tuples.length === 0}
		<div class="empty-state">
			<p>No relationship tuples found.</p>
			<button class="btn-primary" onclick={openCreateDialog}>Create Tuple</button>
		</div>
	{:else}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Subject</th>
						<th>Relation</th>
						<th>Object</th>
						<th>Permission</th>
						<th>Expires</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each tuples as tuple (tuple.id)}
						<tr class:expired={isExpired(tuple)}>
							<td>
								<span class="entity">
									<span class="entity-type">{tuple.from_type}</span>
									<span class="entity-id">{tuple.from_id}</span>
								</span>
							</td>
							<td>
								<span class="relation-badge">{tuple.relationship_type}</span>
							</td>
							<td>
								<span class="entity">
									<span class="entity-type">{tuple.to_type}</span>
									<span class="entity-id">{tuple.to_id}</span>
								</span>
							</td>
							<td>
								<span class="permission-badge">{tuple.permission_level}</span>
							</td>
							<td>
								{#if tuple.expires_at}
									<span class="expires" class:expired={isExpired(tuple)}>
										{formatDate(tuple.expires_at)}
									</span>
								{:else}
									<span class="no-expiry">Never</span>
								{/if}
							</td>
							<td>{formatDate(tuple.created_at)}</td>
							<td class="actions">
								<button class="btn-action delete" onclick={(e) => openDeleteDialog(tuple, e)}>
									Delete
								</button>
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
			<h2>Create Relationship Tuple</h2>

			{#if createError}
				<div class="dialog-error">{createError}</div>
			{/if}

			<div class="form-section">
				<h3>Subject (From)</h3>
				<div class="form-row">
					<div class="form-group">
						<label for="from-type">Type</label>
						<select id="from-type" bind:value={createForm.from_type}>
							<option value="subject">subject</option>
							<option value="group">group</option>
							<option value="org">org</option>
						</select>
					</div>
					<div class="form-group flex-1">
						<label for="from-id">ID</label>
						<input
							id="from-id"
							type="text"
							bind:value={createForm.from_id}
							placeholder="user_123"
						/>
					</div>
				</div>
			</div>

			<div class="form-section">
				<h3>Relation</h3>
				<div class="form-group">
					<label for="relation-type">Relationship Type</label>
					<input
						id="relation-type"
						type="text"
						bind:value={createForm.relationship_type}
						placeholder="viewer, editor, owner..."
					/>
				</div>
			</div>

			<div class="form-section">
				<h3>Object (To)</h3>
				<div class="form-row">
					<div class="form-group">
						<label for="to-type">Type</label>
						<input
							id="to-type"
							type="text"
							bind:value={createForm.to_type}
							placeholder="document"
						/>
					</div>
					<div class="form-group flex-1">
						<label for="to-id">ID</label>
						<input id="to-id" type="text" bind:value={createForm.to_id} placeholder="doc_456" />
					</div>
				</div>
			</div>

			<div class="form-section">
				<h3>Options</h3>
				<div class="form-group">
					<label for="permission-level">Permission Level</label>
					<select id="permission-level" bind:value={createForm.permission_level}>
						<option value="full">Full</option>
						<option value="limited">Limited</option>
						<option value="read_only">Read Only</option>
					</select>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={createForm.has_expiry} />
						Set expiration
					</label>
				</div>

				{#if createForm.has_expiry}
					<div class="form-group">
						<label for="expires-at">Expires At</label>
						<input id="expires-at" type="datetime-local" bind:value={createForm.expires_at} />
					</div>
				{/if}
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
{#if showDeleteDialog && tupleToDelete}
	<div class="dialog-overlay" onclick={() => (showDeleteDialog = false)}>
		<div class="dialog dialog-small" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Relationship Tuple</h2>

			{#if deleteError}
				<div class="dialog-error">{deleteError}</div>
			{/if}

			<p>Are you sure you want to delete this relationship tuple?</p>
			<div class="tuple-preview">
				{formatTupleString(tupleToDelete)}
			</div>
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
	.tuples-page {
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

	.filter-bar input {
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
		width: 160px;
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

	tr.expired {
		opacity: 0.6;
		background-color: #fef2f2;
	}

	.entity {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entity-type {
		font-size: 11px;
		color: #6b7280;
		text-transform: uppercase;
	}

	.entity-id {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
	}

	.relation-badge {
		background-color: #dbeafe;
		color: #1e40af;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 13px;
		font-weight: 500;
	}

	.permission-badge {
		background-color: #f3f4f6;
		color: #374151;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
	}

	.expires {
		font-size: 13px;
		color: #374151;
	}

	.expires.expired {
		color: #b91c1c;
		font-weight: 500;
	}

	.no-expiry {
		color: #6b7280;
		font-style: italic;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.btn-action {
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
		background-color: #f3f4f6;
		color: #374151;
		border: none;
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

	.loading,
	.empty-state {
		text-align: center;
		padding: 60px;
		color: #6b7280;
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
		width: 550px;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-small {
		width: 420px;
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

	.form-section {
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.form-section:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.form-section h3 {
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		margin: 0 0 12px 0;
	}

	.form-row {
		display: flex;
		gap: 12px;
	}

	.form-group {
		margin-bottom: 12px;
	}

	.form-group.flex-1 {
		flex: 1;
	}

	.form-group label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: #374151;
		margin-bottom: 4px;
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
		box-sizing: border-box;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto;
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
		cursor: pointer;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tuple-preview {
		font-family: 'Monaco', 'Menlo', monospace;
		background-color: #f3f4f6;
		padding: 12px;
		border-radius: 6px;
		margin: 12px 0;
		font-size: 13px;
		word-break: break-all;
	}

	.warning-text {
		color: #b91c1c;
		font-size: 14px;
	}
</style>
