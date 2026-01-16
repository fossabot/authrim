<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminAttributesAPI,
		type UserAttribute,
		type AttributeStats,
		type AttributeSourceType,
		getSourceTypeLabel,
		isAttributeExpired,
		formatExpirationStatus
	} from '$lib/api/admin-attributes';

	// State
	let attributes: UserAttribute[] = $state([]);
	let stats: AttributeStats | null = $state(null);
	let loading = $state(true);
	let error = $state('');
	let pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		total_pages: 0
	});

	// Filters
	let filterUserId = $state('');
	let filterAttributeName = $state('');
	let filterSourceType = $state<AttributeSourceType | ''>('');
	let filterSearch = $state('');
	let includeExpired = $state(false);

	// Create dialog state
	let showCreateDialog = $state(false);
	let creating = $state(false);
	let createError = $state('');
	let createForm = $state({
		user_id: '',
		attribute_name: '',
		attribute_value: '',
		has_expiry: false,
		expires_at: ''
	});

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let attributeToDelete: UserAttribute | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	// Cleanup dialog state
	let showCleanupDialog = $state(false);
	let cleaningUp = $state(false);
	let cleanupResult: { deleted_count: number } | null = $state(null);

	async function loadAttributes() {
		loading = true;
		error = '';

		try {
			const response = await adminAttributesAPI.listAttributes({
				page: pagination.page,
				limit: pagination.limit,
				user_id: filterUserId || undefined,
				attribute_name: filterAttributeName || undefined,
				source_type: filterSourceType || undefined,
				include_expired: includeExpired,
				search: filterSearch || undefined
			});

			attributes = response.attributes;
			pagination = response.pagination;
		} catch (err) {
			console.error('Failed to load attributes:', err);
			error = err instanceof Error ? err.message : 'Failed to load attributes';
		} finally {
			loading = false;
		}
	}

	async function loadStats() {
		try {
			stats = await adminAttributesAPI.getStats();
		} catch (err) {
			console.error('Failed to load stats:', err);
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadAttributes();
	}

	function clearFilters() {
		filterUserId = '';
		filterAttributeName = '';
		filterSourceType = '';
		filterSearch = '';
		includeExpired = false;
		pagination.page = 1;
		loadAttributes();
	}

	function goToPage(newPage: number) {
		if (newPage < 1 || newPage > pagination.total_pages) return;
		pagination.page = newPage;
		loadAttributes();
	}

	function openCreateDialog() {
		createForm = {
			user_id: filterUserId || '',
			attribute_name: '',
			attribute_value: '',
			has_expiry: false,
			expires_at: ''
		};
		createError = '';
		showCreateDialog = true;
	}

	async function submitCreate() {
		if (!createForm.user_id || !createForm.attribute_name) {
			createError = 'User ID and attribute name are required';
			return;
		}

		creating = true;
		createError = '';

		try {
			await adminAttributesAPI.createAttribute({
				user_id: createForm.user_id,
				attribute_name: createForm.attribute_name,
				attribute_value: createForm.attribute_value,
				expires_at:
					createForm.has_expiry && createForm.expires_at
						? Math.floor(new Date(createForm.expires_at).getTime() / 1000)
						: undefined
			});

			showCreateDialog = false;
			loadAttributes();
			loadStats();
		} catch (err) {
			console.error('Failed to create attribute:', err);
			createError = err instanceof Error ? err.message : 'Failed to create attribute';
		} finally {
			creating = false;
		}
	}

	function openDeleteDialog(attr: UserAttribute, event: Event) {
		event.stopPropagation();
		attributeToDelete = attr;
		deleteError = '';
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!attributeToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminAttributesAPI.deleteAttribute(attributeToDelete.id);
			showDeleteDialog = false;
			attributeToDelete = null;
			loadAttributes();
			loadStats();
		} catch (err) {
			console.error('Failed to delete attribute:', err);
			deleteError = err instanceof Error ? err.message : 'Failed to delete attribute';
		} finally {
			deleting = false;
		}
	}

	async function cleanupExpired() {
		cleaningUp = true;
		cleanupResult = null;

		try {
			cleanupResult = await adminAttributesAPI.deleteExpiredAttributes();
			loadAttributes();
			loadStats();
		} catch (err) {
			console.error('Failed to cleanup expired attributes:', err);
		} finally {
			cleaningUp = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		loadAttributes();
		loadStats();
	});
</script>

<div class="attributes-page">
	<div class="page-header">
		<div class="header-content">
			<h1>User Attributes</h1>
			<p class="description">Manage user attributes for Attribute-Based Access Control (ABAC).</p>
		</div>
		<div class="header-actions">
			<button class="btn-secondary" onclick={() => (showCleanupDialog = true)}>
				Cleanup Expired
			</button>
			<button class="btn-primary" onclick={openCreateDialog}>+ Add Attribute</button>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadAttributes}>Retry</button>
		</div>
	{/if}

	<!-- Stats Cards -->
	{#if stats}
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">{stats.total}</div>
				<div class="stat-label">Total Attributes</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.active}</div>
				<div class="stat-label">Active</div>
			</div>
			<div class="stat-card warning">
				<div class="stat-value">{stats.expired}</div>
				<div class="stat-label">Expired</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.unique_users}</div>
				<div class="stat-label">Users with Attributes</div>
			</div>
		</div>

		<!-- Source Distribution -->
		<div class="distribution-section">
			<h3>By Source</h3>
			<div class="distribution-bars">
				{#each stats.by_source as source (source.source_type)}
					<div class="distribution-item">
						<span class="source-badge {source.source_type}"
							>{getSourceTypeLabel(source.source_type as AttributeSourceType)}</span
						>
						<div class="bar-container">
							<div
								class="bar {source.source_type}"
								style="width: {(source.count / stats.total) * 100}%"
							></div>
						</div>
						<span class="count">{source.count}</span>
					</div>
				{/each}
			</div>
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
			placeholder="User ID"
			bind:value={filterUserId}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<input
			type="text"
			placeholder="Attribute name"
			bind:value={filterAttributeName}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<select bind:value={filterSourceType} onchange={applyFilters}>
			<option value="">All Sources</option>
			<option value="vc">Verifiable Credential</option>
			<option value="saml">SAML IdP</option>
			<option value="manual">Manual</option>
		</select>
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={includeExpired} onchange={applyFilters} />
			Include expired
		</label>
		<button class="btn-filter" onclick={applyFilters}>Apply</button>
		<button class="btn-clear" onclick={clearFilters}>Clear</button>
	</div>

	<!-- Attributes Table -->
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if attributes.length === 0}
		<div class="empty-state">
			<p>No attributes found.</p>
			<button class="btn-primary" onclick={openCreateDialog}>Add Attribute</button>
		</div>
	{:else}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>User</th>
						<th>Attribute</th>
						<th>Value</th>
						<th>Source</th>
						<th>Verified</th>
						<th>Expiration</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each attributes as attr (attr.id)}
						<tr class:expired={isAttributeExpired(attr)}>
							<td>
								<div class="user-cell">
									<a href="/admin/users/{attr.user_id}" class="user-link">
										{attr.user_email || attr.user_id}
									</a>
									{#if attr.user_name}
										<span class="user-name">{attr.user_name}</span>
									{/if}
								</div>
							</td>
							<td>
								<span class="attribute-name">{attr.attribute_name}</span>
							</td>
							<td>
								<span class="attribute-value" title={attr.attribute_value}>
									{attr.attribute_value.length > 50
										? attr.attribute_value.substring(0, 50) + '...'
										: attr.attribute_value}
								</span>
							</td>
							<td>
								<span class="source-badge {attr.source_type}">
									{getSourceTypeLabel(attr.source_type as AttributeSourceType)}
								</span>
							</td>
							<td>{formatDate(attr.verified_at)}</td>
							<td>
								<span
									class="expiration"
									class:expired={isAttributeExpired(attr)}
									class:expiring={attr.expires_at &&
										attr.expires_at * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
										!isAttributeExpired(attr)}
								>
									{formatExpirationStatus(attr.expires_at)}
								</span>
							</td>
							<td class="actions">
								<button class="btn-action delete" onclick={(e) => openDeleteDialog(attr, e)}>
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
			<h2>Add User Attribute</h2>

			{#if createError}
				<div class="dialog-error">{createError}</div>
			{/if}

			<div class="form-group">
				<label for="user-id">User ID</label>
				<input id="user-id" type="text" bind:value={createForm.user_id} placeholder="user_123" />
			</div>

			<div class="form-group">
				<label for="attr-name">Attribute Name</label>
				<input
					id="attr-name"
					type="text"
					bind:value={createForm.attribute_name}
					placeholder="subscription_tier, verified_email, country..."
				/>
			</div>

			<div class="form-group">
				<label for="attr-value">Attribute Value</label>
				<input
					id="attr-value"
					type="text"
					bind:value={createForm.attribute_value}
					placeholder="premium, true, US..."
				/>
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
{#if showDeleteDialog && attributeToDelete}
	<div class="dialog-overlay" onclick={() => (showDeleteDialog = false)}>
		<div class="dialog dialog-small" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Attribute</h2>

			{#if deleteError}
				<div class="dialog-error">{deleteError}</div>
			{/if}

			<p>
				Are you sure you want to delete the attribute
				<strong>{attributeToDelete.attribute_name}</strong> for user
				<strong>{attributeToDelete.user_email || attributeToDelete.user_id}</strong>?
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

<!-- Cleanup Dialog -->
{#if showCleanupDialog}
	<div class="dialog-overlay" onclick={() => (showCleanupDialog = false)}>
		<div class="dialog dialog-small" onclick={(e) => e.stopPropagation()}>
			<h2>Cleanup Expired Attributes</h2>

			{#if cleanupResult}
				<div class="cleanup-result">
					<p>
						Successfully deleted <strong>{cleanupResult.deleted_count}</strong> expired attributes.
					</p>
				</div>
			{:else}
				<p>
					This will permanently delete all expired attributes from the system.
					{#if stats}
						Currently there are <strong>{stats.expired}</strong> expired attributes.
					{/if}
				</p>
				<p class="warning-text">This action cannot be undone.</p>
			{/if}

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showCleanupDialog = false)}> Close </button>
				{#if !cleanupResult}
					<button class="btn-danger" onclick={cleanupExpired} disabled={cleaningUp}>
						{cleaningUp ? 'Cleaning up...' : 'Delete Expired'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.attributes-page {
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

	.header-actions {
		display: flex;
		gap: 12px;
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

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	.stat-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 20px;
		text-align: center;
	}

	.stat-card.warning {
		border-color: #fbbf24;
		background: #fffbeb;
	}

	.stat-value {
		font-size: 32px;
		font-weight: 700;
		color: #111827;
	}

	.stat-label {
		font-size: 14px;
		color: #6b7280;
		margin-top: 4px;
	}

	/* Distribution Section */
	.distribution-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.distribution-section h3 {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 16px 0;
	}

	.distribution-bars {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.distribution-item {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.distribution-item .source-badge {
		width: 150px;
		flex-shrink: 0;
	}

	.bar-container {
		flex: 1;
		height: 24px;
		background: #f3f4f6;
		border-radius: 4px;
		overflow: hidden;
	}

	.bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.bar.vc {
		background: linear-gradient(90deg, #10b981, #059669);
	}

	.bar.saml {
		background: linear-gradient(90deg, #3b82f6, #2563eb);
	}

	.bar.manual {
		background: linear-gradient(90deg, #6b7280, #4b5563);
	}

	.distribution-item .count {
		width: 60px;
		text-align: right;
		font-weight: 600;
		color: #374151;
	}

	/* Filters */
	.filter-bar {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
		flex-wrap: wrap;
		align-items: center;
	}

	.filter-bar input[type='text'],
	.filter-bar select {
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
	}

	.filter-bar input[type='text'] {
		width: 160px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		color: #374151;
		cursor: pointer;
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
		background-color: #fef2f2;
	}

	.user-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-link {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}

	.user-link:hover {
		text-decoration: underline;
	}

	.user-name {
		font-size: 12px;
		color: #6b7280;
	}

	.attribute-name {
		font-family: 'Monaco', 'Menlo', monospace;
		background-color: #f3f4f6;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 13px;
	}

	.attribute-value {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
		color: #374151;
	}

	.source-badge {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.source-badge.vc {
		background-color: #dcfce7;
		color: #166534;
	}

	.source-badge.saml {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.source-badge.manual {
		background-color: #f3f4f6;
		color: #374151;
	}

	.expiration {
		font-size: 13px;
	}

	.expiration.expired {
		color: #b91c1c;
		font-weight: 500;
	}

	.expiration.expiring {
		color: #d97706;
		font-weight: 500;
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

	/* Buttons */
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

	.form-group input[type='text'],
	.form-group input[type='datetime-local'] {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
		box-sizing: border-box;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
	}

	.warning-text {
		color: #b91c1c;
		font-size: 14px;
	}

	.cleanup-result {
		background-color: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 6px;
		padding: 16px;
		margin-bottom: 16px;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 600px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.page-header {
			flex-direction: column;
			gap: 16px;
		}
	}
</style>
