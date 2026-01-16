<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		adminReBACAPI,
		type RelationDefinition,
		type RelationExpression,
		formatRelationExpression,
		getExpressionTypeLabel
	} from '$lib/api/admin-rebac';

	// State
	let definition: RelationDefinition | null = $state(null);
	let loading = $state(true);
	let error = $state('');

	// Edit state
	let isEditing = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let editForm = $state({
		description: '',
		priority: 0,
		is_active: true
	});

	// Expression editor state
	let showExpressionEditor = $state(false);
	let expressionJson = $state('');
	let expressionError = $state('');

	// Test permission state
	let showTestPanel = $state(false);
	let testUserId = $state('');
	let testResult: { allowed: boolean; resolved_via?: string; path?: string[] } | null =
		$state(null);
	let testing = $state(false);
	let testError = $state('');

	const definitionId = $derived($page.params.id);

	async function loadDefinition() {
		if (!definitionId) {
			error = 'Invalid definition ID';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await adminReBACAPI.getDefinition(definitionId);
			definition = response.definition;
			editForm = {
				description: definition.description || '',
				priority: definition.priority,
				is_active: definition.is_active
			};
			expressionJson = JSON.stringify(definition.definition, null, 2);
		} catch (err) {
			console.error('Failed to load definition:', err);
			error = err instanceof Error ? err.message : 'Failed to load definition';
		} finally {
			loading = false;
		}
	}

	function startEditing() {
		if (!definition) return;
		editForm = {
			description: definition.description || '',
			priority: definition.priority,
			is_active: definition.is_active
		};
		expressionJson = JSON.stringify(definition.definition, null, 2);
		saveError = '';
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		saveError = '';
		expressionError = '';
	}

	async function saveChanges() {
		if (!definition) return;

		saving = true;
		saveError = '';

		try {
			// Parse expression if edited
			let newDefinition: RelationExpression | undefined;
			const currentJson = JSON.stringify(definition.definition, null, 2);
			if (expressionJson !== currentJson) {
				try {
					newDefinition = JSON.parse(expressionJson);
				} catch {
					saveError = 'Invalid JSON in expression';
					saving = false;
					return;
				}
			}

			await adminReBACAPI.updateDefinition(definition.id, {
				definition: newDefinition,
				description: editForm.description || undefined,
				priority: editForm.priority,
				is_active: editForm.is_active
			});

			isEditing = false;
			loadDefinition();
		} catch (err) {
			console.error('Failed to update definition:', err);
			saveError = err instanceof Error ? err.message : 'Failed to update definition';
		} finally {
			saving = false;
		}
	}

	async function toggleActive() {
		if (!definition) return;

		saving = true;
		try {
			await adminReBACAPI.updateDefinition(definition.id, {
				is_active: !definition.is_active
			});
			loadDefinition();
		} catch (err) {
			console.error('Failed to toggle status:', err);
			saveError = err instanceof Error ? err.message : 'Failed to toggle status';
		} finally {
			saving = false;
		}
	}

	async function runTestPermission() {
		if (!definition || !testUserId) {
			testError = 'User ID is required';
			return;
		}

		testing = true;
		testError = '';
		testResult = null;

		try {
			testResult = await adminReBACAPI.checkPermission({
				user_id: testUserId,
				relation: definition.relation_name,
				object: `${definition.object_type}:test_object`,
				object_type: definition.object_type
			});
		} catch (err) {
			console.error('Failed to test permission:', err);
			testError = err instanceof Error ? err.message : 'Failed to test permission';
		} finally {
			testing = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function renderExpressionTree(expr: RelationExpression, depth: number = 0): string {
		const indent = '  '.repeat(depth);
		switch (expr.type) {
			case 'direct':
				return `${indent}• Direct: ${expr.relation}`;
			case 'union':
				return `${indent}• Union (OR)\n${expr.children.map((c) => renderExpressionTree(c, depth + 1)).join('\n')}`;
			case 'intersection':
				return `${indent}• Intersection (AND)\n${expr.children.map((c) => renderExpressionTree(c, depth + 1)).join('\n')}`;
			case 'exclusion':
				return `${indent}• Exclusion\n${indent}  Base:\n${renderExpressionTree(expr.base, depth + 2)}\n${indent}  Subtract:\n${renderExpressionTree(expr.subtract, depth + 2)}`;
			case 'tuple_to_userset':
				return `${indent}• Inherited: ${expr.tupleset.relation} → ${expr.computed_userset.relation}`;
			default:
				return `${indent}• Unknown`;
		}
	}

	onMount(() => {
		loadDefinition();
	});
</script>

<div class="detail-page">
	<div class="page-header">
		<nav class="breadcrumb">
			<a href="/admin/rebac">ReBAC</a>
			<span>/</span>
			<a href="/admin/rebac/definitions">Relation Definitions</a>
			<span>/</span>
			<span>{definition?.relation_name || 'Loading...'}</span>
		</nav>

		{#if definition}
			<div class="header-row">
				<div class="header-content">
					<h1>
						<span class="object-type">{definition.object_type}</span>
						<span class="separator">#</span>
						<span class="relation-name">{definition.relation_name}</span>
					</h1>
					{#if definition.description}
						<p class="description">{definition.description}</p>
					{/if}
				</div>
				<div class="header-actions">
					{#if !isEditing}
						{#if definition.tenant_id !== 'default'}
							<button class="btn-secondary" onclick={startEditing}>Edit</button>
						{/if}
						<button
							class="btn-toggle"
							class:active={definition.is_active}
							onclick={toggleActive}
							disabled={saving}
						>
							{definition.is_active ? 'Active' : 'Inactive'}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadDefinition}>Retry</button>
		</div>
	{/if}

	{#if saveError}
		<div class="error-banner">
			<span>{saveError}</span>
			<button onclick={() => (saveError = '')}>Dismiss</button>
		</div>
	{/if}

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if definition}
		<div class="content-grid">
			<!-- Main Details -->
			<div class="detail-card">
				<h2>Details</h2>
				{#if isEditing}
					<div class="form-group">
						<label for="edit-description">Description</label>
						<textarea
							id="edit-description"
							bind:value={editForm.description}
							placeholder="Optional description..."
							rows="3"
						></textarea>
					</div>

					<div class="form-group">
						<label for="edit-priority">Priority</label>
						<input
							id="edit-priority"
							type="number"
							bind:value={editForm.priority}
							min="0"
							max="1000"
						/>
						<small>Higher priority definitions are evaluated first</small>
					</div>

					<div class="form-group">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={editForm.is_active} />
							<span>Active</span>
						</label>
					</div>

					<div class="form-actions">
						<button class="btn-secondary" onclick={cancelEditing}>Cancel</button>
						<button class="btn-primary" onclick={saveChanges} disabled={saving}>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				{:else}
					<div class="detail-row">
						<span class="label">ID</span>
						<span class="value mono">{definition.id}</span>
					</div>
					<div class="detail-row">
						<span class="label">Object Type</span>
						<span class="value">{definition.object_type}</span>
					</div>
					<div class="detail-row">
						<span class="label">Relation Name</span>
						<span class="value mono">{definition.relation_name}</span>
					</div>
					<div class="detail-row">
						<span class="label">Priority</span>
						<span class="value">{definition.priority}</span>
					</div>
					<div class="detail-row">
						<span class="label">Status</span>
						<span class="status-badge" class:active={definition.is_active}>
							{definition.is_active ? 'Active' : 'Inactive'}
						</span>
					</div>
					<div class="detail-row">
						<span class="label">Source</span>
						<span class="source-badge" class:default={definition.tenant_id === 'default'}>
							{definition.tenant_id === 'default' ? 'Default' : 'Custom'}
						</span>
					</div>
					<div class="detail-row">
						<span class="label">Created</span>
						<span class="value">{formatDate(definition.created_at)}</span>
					</div>
					<div class="detail-row">
						<span class="label">Updated</span>
						<span class="value">{formatDate(definition.updated_at)}</span>
					</div>
				{/if}
			</div>

			<!-- Expression -->
			<div class="detail-card">
				<div class="card-header">
					<h2>Relation Expression</h2>
					<span class="expr-type-badge">{getExpressionTypeLabel(definition.definition.type)}</span>
				</div>

				{#if isEditing && showExpressionEditor}
					<div class="expression-editor">
						<label for="expr-json">Expression JSON</label>
						<textarea id="expr-json" bind:value={expressionJson} rows="12" class="mono"></textarea>
						{#if expressionError}
							<div class="field-error">{expressionError}</div>
						{/if}
						<small>Edit the JSON structure of the relation expression</small>
					</div>
				{:else if isEditing}
					<button class="btn-edit-expr" onclick={() => (showExpressionEditor = true)}>
						Edit Expression JSON
					</button>
				{/if}

				<div class="expression-display">
					<div class="expression-formula">
						<span class="label">Formula</span>
						<code>{formatRelationExpression(definition.definition)}</code>
					</div>

					<div class="expression-tree">
						<span class="label">Structure</span>
						<pre>{renderExpressionTree(definition.definition)}</pre>
					</div>
				</div>
			</div>

			<!-- Test Panel -->
			<div class="detail-card test-panel">
				<div class="card-header">
					<h2>Test Permission</h2>
					<button class="btn-toggle-panel" onclick={() => (showTestPanel = !showTestPanel)}>
						{showTestPanel ? 'Hide' : 'Show'}
					</button>
				</div>

				{#if showTestPanel}
					<p class="test-description">
						Test if a user would have the <strong>{definition.relation_name}</strong> relation on a
						<strong>{definition.object_type}</strong> object.
					</p>

					<div class="test-form">
						<div class="form-group">
							<label for="test-user">User ID</label>
							<input id="test-user" type="text" bind:value={testUserId} placeholder="user_123" />
						</div>

						<button class="btn-primary" onclick={runTestPermission} disabled={testing}>
							{testing ? 'Testing...' : 'Run Test'}
						</button>
					</div>

					{#if testError}
						<div class="test-error">{testError}</div>
					{/if}

					{#if testResult}
						<div
							class="test-result"
							class:allowed={testResult.allowed}
							class:denied={!testResult.allowed}
						>
							<div class="result-status">
								{testResult.allowed ? '✅ ALLOWED' : '❌ DENIED'}
							</div>
							{#if testResult.resolved_via}
								<div class="result-detail">
									<span class="label">Resolved via:</span>
									<span class="value">{testResult.resolved_via}</span>
								</div>
							{/if}
							{#if testResult.path && testResult.path.length > 0}
								<div class="result-detail">
									<span class="label">Path:</span>
									<span class="value path">{testResult.path.join(' → ')}</span>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Expression Type Reference -->
		<div class="reference-section">
			<h3>Expression Types Reference</h3>
			<div class="reference-grid">
				<div class="reference-item">
					<strong>Direct</strong>
					<p>Checks for a direct relationship tuple in the database.</p>
					<code>direct:viewer</code>
				</div>
				<div class="reference-item">
					<strong>Union (OR)</strong>
					<p>User has the relation if ANY child expression is satisfied.</p>
					<code>(viewer OR editor OR owner)</code>
				</div>
				<div class="reference-item">
					<strong>Intersection (AND)</strong>
					<p>User has the relation if ALL child expressions are satisfied.</p>
					<code>(member AND verified)</code>
				</div>
				<div class="reference-item">
					<strong>Exclusion (NOT)</strong>
					<p>User has the relation if base is satisfied but subtract is not.</p>
					<code>(member EXCEPT blocked)</code>
				</div>
				<div class="reference-item">
					<strong>Inherited (Tuple-to-Userset)</strong>
					<p>Inherits relation from a parent object through a relation chain.</p>
					<code>parent→viewer</code>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.detail-page {
		padding: 24px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 24px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #6b7280;
		margin-bottom: 16px;
	}

	.breadcrumb a {
		color: #3b82f6;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-content h1 {
		font-size: 28px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 8px 0;
	}

	.object-type {
		color: #1e40af;
	}

	.separator {
		color: #9ca3af;
		margin: 0 4px;
	}

	.relation-name {
		color: #111827;
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

	.loading {
		text-align: center;
		padding: 60px;
		color: #6b7280;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}

	.detail-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
	}

	.detail-card h2 {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 20px 0;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.card-header h2 {
		margin: 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-row .label {
		font-size: 14px;
		color: #6b7280;
	}

	.detail-row .value {
		font-size: 14px;
		color: #111827;
	}

	.mono {
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.status-badge {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 13px;
		font-weight: 500;
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.status-badge.active {
		background-color: #dcfce7;
		color: #166534;
	}

	.source-badge {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 13px;
		font-weight: 500;
		background-color: #dbeafe;
		color: #1e40af;
	}

	.source-badge.default {
		background-color: #f3e8ff;
		color: #6b21a8;
	}

	.expr-type-badge {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		background-color: #fef3c7;
		color: #92400e;
	}

	.expression-display {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.expression-formula {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.expression-formula .label {
		font-size: 12px;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
	}

	.expression-formula code {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 14px;
		background-color: #f3f4f6;
		padding: 12px;
		border-radius: 6px;
		display: block;
		overflow-x: auto;
	}

	.expression-tree {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.expression-tree .label {
		font-size: 12px;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
	}

	.expression-tree pre {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
		background-color: #f9fafb;
		padding: 12px;
		border-radius: 6px;
		margin: 0;
		overflow-x: auto;
		white-space: pre;
	}

	.expression-editor {
		margin-bottom: 16px;
	}

	.expression-editor label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: #374151;
		margin-bottom: 6px;
	}

	.expression-editor textarea {
		width: 100%;
		padding: 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
		resize: vertical;
		box-sizing: border-box;
	}

	.expression-editor small {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		color: #6b7280;
	}

	.btn-edit-expr {
		padding: 8px 16px;
		background-color: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 13px;
		cursor: pointer;
		margin-bottom: 16px;
	}

	.btn-edit-expr:hover {
		background-color: #e5e7eb;
	}

	.test-panel {
		grid-column: span 2;
	}

	.btn-toggle-panel {
		padding: 6px 12px;
		background-color: #f3f4f6;
		border: none;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
	}

	.test-description {
		font-size: 14px;
		color: #6b7280;
		margin: 0 0 16px 0;
	}

	.test-form {
		display: flex;
		gap: 16px;
		align-items: flex-end;
		margin-bottom: 16px;
	}

	.test-form .form-group {
		flex: 1;
		margin: 0;
	}

	.test-error {
		padding: 12px;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #b91c1c;
		font-size: 14px;
	}

	.test-result {
		padding: 16px;
		border-radius: 8px;
		margin-top: 16px;
	}

	.test-result.allowed {
		background-color: #ecfdf5;
		border: 1px solid #a7f3d0;
	}

	.test-result.denied {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
	}

	.result-status {
		font-size: 16px;
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

	.reference-section {
		margin-top: 32px;
		background: #f9fafb;
		border-radius: 12px;
		padding: 24px;
	}

	.reference-section h3 {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 16px 0;
	}

	.reference-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.reference-item {
		background: white;
		padding: 16px;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.reference-item strong {
		color: #111827;
		display: block;
		margin-bottom: 6px;
	}

	.reference-item p {
		font-size: 13px;
		color: #6b7280;
		margin: 0 0 8px 0;
	}

	.reference-item code {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 12px;
		background-color: #f3f4f6;
		padding: 4px 8px;
		border-radius: 4px;
		display: inline-block;
	}

	/* Form styles */
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

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		margin-top: 20px;
	}

	.field-error {
		color: #b91c1c;
		font-size: 13px;
		margin-top: 4px;
	}

	/* Button styles */
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

	.btn-toggle {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		border: none;
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.btn-toggle.active {
		background-color: #dcfce7;
		color: #166534;
	}

	.btn-toggle:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.test-panel {
			grid-column: span 1;
		}

		.header-row {
			flex-direction: column;
			gap: 16px;
		}
	}
</style>
