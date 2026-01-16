<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminReBACAPI,
		type ObjectTypeSummary,
		type PermissionCheckResult
	} from '$lib/api/admin-rebac';

	// State
	let objectTypes: ObjectTypeSummary[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Permission check state
	let checkUserId = $state('');
	let checkRelation = $state('');
	let checkObject = $state('');
	let checkResult: PermissionCheckResult | null = $state(null);
	let checking = $state(false);
	let checkError = $state('');

	async function loadObjectTypes() {
		loading = true;
		error = '';

		try {
			const response = await adminReBACAPI.listObjectTypes();
			objectTypes = response.object_types;
		} catch (err) {
			console.error('Failed to load object types:', err);
			error = err instanceof Error ? err.message : 'Failed to load object types';
		} finally {
			loading = false;
		}
	}

	async function runPermissionCheck() {
		if (!checkUserId || !checkRelation || !checkObject) {
			checkError = 'All fields are required';
			return;
		}

		checking = true;
		checkError = '';
		checkResult = null;

		try {
			checkResult = await adminReBACAPI.checkPermission({
				user_id: checkUserId,
				relation: checkRelation,
				object: checkObject
			});
		} catch (err) {
			console.error('Failed to check permission:', err);
			checkError = err instanceof Error ? err.message : 'Failed to check permission';
		} finally {
			checking = false;
		}
	}

	onMount(() => {
		loadObjectTypes();
	});
</script>

<div class="rebac-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Relationship-Based Access Control</h1>
			<p class="description">
				Manage relation definitions and relationship tuples using Zanzibar-style access control.
			</p>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadObjectTypes}>Retry</button>
		</div>
	{/if}

	<div class="content-grid">
		<!-- Navigation Cards -->
		<div class="nav-section">
			<h2>Management</h2>
			<div class="nav-cards">
				<a href="/admin/rebac/definitions" class="nav-card">
					<div class="card-icon">📋</div>
					<div class="card-content">
						<h3>Relation Definitions</h3>
						<p>Configure how relations are computed (union, intersection, inheritance)</p>
					</div>
					<div class="card-arrow">→</div>
				</a>

				<a href="/admin/rebac/tuples" class="nav-card">
					<div class="card-icon">🔗</div>
					<div class="card-content">
						<h3>Relationship Tuples</h3>
						<p>Manage user-relation-object assignments</p>
					</div>
					<div class="card-arrow">→</div>
				</a>
			</div>
		</div>

		<!-- Object Types Summary -->
		<div class="summary-section">
			<h2>Object Types</h2>
			{#if loading}
				<div class="loading">Loading...</div>
			{:else if objectTypes.length === 0}
				<div class="empty-state">
					<p>No relation definitions configured yet.</p>
					<a href="/admin/rebac/definitions" class="btn-primary">Create Definition</a>
				</div>
			{:else}
				<div class="object-types-grid">
					{#each objectTypes as objType (objType.name)}
						<a href="/admin/rebac/definitions?object_type={objType.name}" class="object-type-card">
							<div class="type-name">{objType.name}</div>
							<div class="type-count">{objType.definition_count} definitions</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Permission Check Tool -->
		<div class="check-section">
			<h2>Permission Check</h2>
			<p class="section-description">Test if a user has a specific relation to an object.</p>

			<div class="check-form">
				<div class="form-row">
					<label for="check-user">User ID</label>
					<input id="check-user" type="text" bind:value={checkUserId} placeholder="user_123" />
				</div>

				<div class="form-row">
					<label for="check-relation">Relation</label>
					<input id="check-relation" type="text" bind:value={checkRelation} placeholder="viewer" />
				</div>

				<div class="form-row">
					<label for="check-object">Object</label>
					<input
						id="check-object"
						type="text"
						bind:value={checkObject}
						placeholder="document:doc_456"
					/>
				</div>

				<button class="btn-primary" onclick={runPermissionCheck} disabled={checking}>
					{checking ? 'Checking...' : 'Check Permission'}
				</button>
			</div>

			{#if checkError}
				<div class="check-error">{checkError}</div>
			{/if}

			{#if checkResult}
				<div
					class="check-result"
					class:allowed={checkResult.allowed}
					class:denied={!checkResult.allowed}
				>
					<div class="result-status">
						{checkResult.allowed ? '✅ ALLOWED' : '❌ DENIED'}
					</div>
					{#if checkResult.resolved_via}
						<div class="result-detail">
							<span class="label">Resolved via:</span>
							<span class="value">{checkResult.resolved_via}</span>
						</div>
					{/if}
					{#if checkResult.path && checkResult.path.length > 0}
						<div class="result-detail">
							<span class="label">Path:</span>
							<span class="value path">{checkResult.path.join(' → ')}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.rebac-page {
		padding: 24px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
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

	.content-grid {
		display: grid;
		gap: 32px;
	}

	h2 {
		font-size: 18px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 16px 0;
	}

	.section-description {
		color: #6b7280;
		margin: -8px 0 16px 0;
		font-size: 14px;
	}

	/* Navigation Cards */
	.nav-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 16px;
	}

	.nav-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		text-decoration: none;
		transition: all 0.2s;
	}

	.nav-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
	}

	.card-icon {
		font-size: 32px;
		flex-shrink: 0;
	}

	.card-content {
		flex: 1;
	}

	.card-content h3 {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 4px 0;
	}

	.card-content p {
		font-size: 14px;
		color: #6b7280;
		margin: 0;
	}

	.card-arrow {
		font-size: 20px;
		color: #9ca3af;
		transition: transform 0.2s;
	}

	.nav-card:hover .card-arrow {
		transform: translateX(4px);
		color: #3b82f6;
	}

	/* Object Types Grid */
	.object-types-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
	}

	.object-type-card {
		padding: 16px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		text-decoration: none;
		transition: all 0.2s;
	}

	.object-type-card:hover {
		border-color: #3b82f6;
		background: #f8fafc;
	}

	.type-name {
		font-weight: 600;
		color: #111827;
		margin-bottom: 4px;
	}

	.type-count {
		font-size: 13px;
		color: #6b7280;
	}

	.loading {
		color: #6b7280;
		padding: 20px;
		text-align: center;
	}

	.empty-state {
		text-align: center;
		padding: 40px;
		background: #f9fafb;
		border-radius: 8px;
	}

	.empty-state p {
		color: #6b7280;
		margin: 0 0 16px 0;
	}

	/* Permission Check Form */
	.check-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
	}

	.check-form {
		display: grid;
		gap: 16px;
		max-width: 500px;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-row label {
		font-size: 14px;
		font-weight: 500;
		color: #374151;
	}

	.form-row input {
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
	}

	.form-row input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.btn-primary {
		display: inline-block;
		background-color: #3b82f6;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		transition: background-color 0.2s;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.check-error {
		margin-top: 16px;
		padding: 12px;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #b91c1c;
		font-size: 14px;
	}

	.check-result {
		margin-top: 16px;
		padding: 16px;
		border-radius: 8px;
	}

	.check-result.allowed {
		background-color: #ecfdf5;
		border: 1px solid #a7f3d0;
	}

	.check-result.denied {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
	}

	.result-status {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 12px;
	}

	.result-detail {
		font-size: 14px;
		margin-top: 8px;
	}

	.result-detail .label {
		color: #6b7280;
		margin-right: 8px;
	}

	.result-detail .value {
		font-weight: 500;
		color: #111827;
	}

	.result-detail .value.path {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
		background: rgba(0, 0, 0, 0.05);
		padding: 2px 6px;
		border-radius: 4px;
	}
</style>
