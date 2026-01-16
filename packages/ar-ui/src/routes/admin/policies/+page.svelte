<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminPoliciesAPI,
		type PolicyRule,
		type PolicyCondition,
		type ConditionTypeMetadata,
		type ConditionCategory,
		type PolicyContext,
		type SimulationResult,
		getEffectColor,
		getEffectLabel,
		formatCondition,
		getCategoryIcon,
		createEmptyContext
	} from '$lib/api/admin-policies';

	// State
	let rules: PolicyRule[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let pagination = $state({
		page: 1,
		limit: 20,
		total: 0,
		total_pages: 0
	});

	// Filters
	let filterEnabled = $state<boolean | undefined>(undefined);
	let filterSearch = $state('');

	// Condition types metadata
	let conditionTypes: ConditionTypeMetadata[] = $state([]);
	let categories: ConditionCategory[] = $state([]);

	// Create/Edit dialog state
	let showRuleDialog = $state(false);
	let editingRule: PolicyRule | null = $state(null);
	let ruleForm = $state({
		name: '',
		description: '',
		priority: 100,
		effect: 'allow' as 'allow' | 'deny',
		resource_types: [] as string[],
		actions: [] as string[],
		conditions: [] as PolicyCondition[],
		enabled: true
	});
	let saving = $state(false);
	let saveError = $state('');

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let ruleToDelete: PolicyRule | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	// Simulation dialog state
	let showSimulateDialog = $state(false);
	let simulationContext: PolicyContext = $state(createEmptyContext());
	let simulationResult: SimulationResult | null = $state(null);
	let simulating = $state(false);
	let simulationError = $state('');

	// Condition builder state
	let showConditionDialog = $state(false);
	let selectedCategory = $state('');
	let selectedConditionType = $state('');
	let conditionParams: Record<string, unknown> = $state({});

	// Resource/Action inputs
	let resourceTypeInput = $state('');
	let actionInput = $state('');

	async function loadRules() {
		loading = true;
		error = '';

		try {
			const response = await adminPoliciesAPI.listPolicies({
				page: pagination.page,
				limit: pagination.limit,
				enabled: filterEnabled,
				search: filterSearch || undefined
			});

			rules = response.rules;
			pagination = response.pagination;
		} catch (err) {
			console.error('Failed to load policies:', err);
			error = err instanceof Error ? err.message : 'Failed to load policies';
		} finally {
			loading = false;
		}
	}

	async function loadConditionTypes() {
		try {
			const response = await adminPoliciesAPI.getConditionTypes();
			conditionTypes = response.condition_types;
			categories = response.categories;
		} catch (err) {
			console.error('Failed to load condition types:', err);
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadRules();
	}

	function clearFilters() {
		filterEnabled = undefined;
		filterSearch = '';
		pagination.page = 1;
		loadRules();
	}

	function goToPage(newPage: number) {
		if (newPage < 1 || newPage > pagination.total_pages) return;
		pagination.page = newPage;
		loadRules();
	}

	function openCreateDialog() {
		editingRule = null;
		ruleForm = {
			name: '',
			description: '',
			priority: 100,
			effect: 'allow',
			resource_types: [],
			actions: [],
			conditions: [],
			enabled: true
		};
		resourceTypeInput = '';
		actionInput = '';
		saveError = '';
		showRuleDialog = true;
	}

	function openEditDialog(rule: PolicyRule) {
		editingRule = rule;
		ruleForm = {
			name: rule.name,
			description: rule.description || '',
			priority: rule.priority,
			effect: rule.effect,
			resource_types: [...rule.resource_types],
			actions: [...rule.actions],
			conditions: [...rule.conditions],
			enabled: rule.enabled
		};
		resourceTypeInput = '';
		actionInput = '';
		saveError = '';
		showRuleDialog = true;
	}

	async function saveRule() {
		if (!ruleForm.name) {
			saveError = 'Name is required';
			return;
		}

		saving = true;
		saveError = '';

		try {
			if (editingRule) {
				await adminPoliciesAPI.updatePolicy(editingRule.id, ruleForm);
			} else {
				await adminPoliciesAPI.createPolicy(ruleForm);
			}

			showRuleDialog = false;
			loadRules();
		} catch (err) {
			console.error('Failed to save policy:', err);
			saveError = err instanceof Error ? err.message : 'Failed to save policy';
		} finally {
			saving = false;
		}
	}

	function openDeleteDialog(rule: PolicyRule, event: Event) {
		event.stopPropagation();
		ruleToDelete = rule;
		deleteError = '';
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!ruleToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminPoliciesAPI.deletePolicy(ruleToDelete.id);
			showDeleteDialog = false;
			ruleToDelete = null;
			loadRules();
		} catch (err) {
			console.error('Failed to delete policy:', err);
			deleteError = err instanceof Error ? err.message : 'Failed to delete policy';
		} finally {
			deleting = false;
		}
	}

	async function toggleEnabled(rule: PolicyRule, event: Event) {
		event.stopPropagation();
		try {
			await adminPoliciesAPI.updatePolicy(rule.id, { enabled: !rule.enabled });
			loadRules();
		} catch (err) {
			console.error('Failed to toggle policy:', err);
		}
	}

	function openSimulateDialog() {
		simulationContext = createEmptyContext();
		simulationResult = null;
		simulationError = '';
		showSimulateDialog = true;
	}

	async function runSimulation() {
		simulating = true;
		simulationError = '';
		simulationResult = null;

		try {
			simulationResult = await adminPoliciesAPI.simulate(simulationContext, true);
		} catch (err) {
			console.error('Simulation failed:', err);
			simulationError = err instanceof Error ? err.message : 'Simulation failed';
		} finally {
			simulating = false;
		}
	}

	// Condition builder helpers
	function openConditionBuilder() {
		selectedCategory = '';
		selectedConditionType = '';
		conditionParams = {};
		showConditionDialog = true;
	}

	function selectCategory(categoryId: string) {
		selectedCategory = categoryId;
		selectedConditionType = '';
		conditionParams = {};
	}

	function selectConditionType(type: string) {
		selectedConditionType = type;
		conditionParams = {};
	}

	function addCondition() {
		if (!selectedConditionType) return;

		const condition: PolicyCondition = {
			type: selectedConditionType as PolicyCondition['type'],
			params: { ...conditionParams }
		};

		ruleForm.conditions = [...ruleForm.conditions, condition];
		showConditionDialog = false;
	}

	function removeCondition(index: number) {
		ruleForm.conditions = ruleForm.conditions.filter((_, i) => i !== index);
	}

	// Resource types and actions helpers
	function addResourceType() {
		if (!resourceTypeInput.trim()) return;
		if (!ruleForm.resource_types.includes(resourceTypeInput.trim())) {
			ruleForm.resource_types = [...ruleForm.resource_types, resourceTypeInput.trim()];
		}
		resourceTypeInput = '';
	}

	function removeResourceType(type: string) {
		ruleForm.resource_types = ruleForm.resource_types.filter((t) => t !== type);
	}

	function addAction() {
		if (!actionInput.trim()) return;
		if (!ruleForm.actions.includes(actionInput.trim())) {
			ruleForm.actions = [...ruleForm.actions, actionInput.trim()];
		}
		actionInput = '';
	}

	function removeAction(action: string) {
		ruleForm.actions = ruleForm.actions.filter((a) => a !== action);
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

	$effect(() => {
		if (selectedConditionType) {
			// Get the condition type metadata
			const typeInfo = conditionTypes.find((t) => t.type === selectedConditionType);
			if (typeInfo) {
				// Initialize params with defaults
				const newParams: Record<string, unknown> = {};
				for (const param of typeInfo.params) {
					if (param.type === 'string[]' || param.type === 'number[]') {
						newParams[param.name] = [];
					} else if (param.type === 'number') {
						newParams[param.name] = 0;
					} else {
						newParams[param.name] = '';
					}
				}
				conditionParams = newParams;
			}
		}
	});

	onMount(() => {
		loadRules();
		loadConditionTypes();
	});
</script>

<div class="policies-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Policy Rules</h1>
			<p class="description">Create and manage access control policies with visual builder.</p>
		</div>
		<div class="header-actions">
			<button class="btn-secondary" onclick={openSimulateDialog}>Simulate</button>
			<button class="btn-primary" onclick={openCreateDialog}>+ Create Policy</button>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={loadRules}>Retry</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="filter-bar">
		<input
			type="text"
			placeholder="Search policies..."
			bind:value={filterSearch}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<select bind:value={filterEnabled} onchange={applyFilters}>
			<option value={undefined}>All Status</option>
			<option value={true}>Enabled</option>
			<option value={false}>Disabled</option>
		</select>
		<button class="btn-filter" onclick={applyFilters}>Apply</button>
		<button class="btn-clear" onclick={clearFilters}>Clear</button>
	</div>

	<!-- Rules List -->
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if rules.length === 0}
		<div class="empty-state">
			<p>No policy rules found.</p>
			<button class="btn-primary" onclick={openCreateDialog}>Create Policy</button>
		</div>
	{:else}
		<div class="rules-list">
			{#each rules as rule (rule.id)}
				<div class="rule-card" class:disabled={!rule.enabled}>
					<div class="rule-header">
						<div class="rule-info">
							<span class="rule-priority">#{rule.priority}</span>
							<h3 class="rule-name">{rule.name}</h3>
							<span class="effect-badge {getEffectColor(rule.effect)}">
								{getEffectLabel(rule.effect)}
							</span>
							{#if !rule.enabled}
								<span class="status-badge disabled">Disabled</span>
							{/if}
						</div>
						<div class="rule-actions">
							<button
								class="btn-toggle"
								onclick={(e) => toggleEnabled(rule, e)}
								title={rule.enabled ? 'Disable' : 'Enable'}
							>
								{rule.enabled ? '●' : '○'}
							</button>
							<button class="btn-action" onclick={() => openEditDialog(rule)}>Edit</button>
							<button class="btn-action delete" onclick={(e) => openDeleteDialog(rule, e)}>
								Delete
							</button>
						</div>
					</div>

					{#if rule.description}
						<p class="rule-description">{rule.description}</p>
					{/if}

					<div class="rule-details">
						{#if rule.resource_types.length > 0}
							<div class="detail-item">
								<span class="detail-label">Resources:</span>
								<span class="detail-value">
									{#each rule.resource_types as type (type)}
										<span class="tag">{type}</span>
									{/each}
								</span>
							</div>
						{/if}

						{#if rule.actions.length > 0}
							<div class="detail-item">
								<span class="detail-label">Actions:</span>
								<span class="detail-value">
									{#each rule.actions as action (action)}
										<span class="tag">{action}</span>
									{/each}
								</span>
							</div>
						{/if}

						{#if rule.conditions.length > 0}
							<div class="detail-item conditions">
								<span class="detail-label">Conditions:</span>
								<div class="conditions-list">
									{#each rule.conditions as condition, i (i)}
										<span class="condition-tag">{formatCondition(condition)}</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<div class="rule-meta">
						<span>Updated {formatDate(rule.updated_at)}</span>
					</div>
				</div>
			{/each}
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

<!-- Create/Edit Rule Dialog -->
{#if showRuleDialog}
	<div class="dialog-overlay" onclick={() => (showRuleDialog = false)}>
		<div class="dialog dialog-large" onclick={(e) => e.stopPropagation()}>
			<h2>{editingRule ? 'Edit Policy Rule' : 'Create Policy Rule'}</h2>

			{#if saveError}
				<div class="dialog-error">{saveError}</div>
			{/if}

			<div class="form-row">
				<div class="form-group flex-2">
					<label for="rule-name">Name *</label>
					<input
						id="rule-name"
						type="text"
						bind:value={ruleForm.name}
						placeholder="e.g., Allow org admins to manage users"
					/>
				</div>
				<div class="form-group">
					<label for="rule-priority">Priority</label>
					<input
						id="rule-priority"
						type="number"
						bind:value={ruleForm.priority}
						min="1"
						max="1000"
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="rule-description">Description</label>
				<textarea
					id="rule-description"
					bind:value={ruleForm.description}
					placeholder="Describe what this policy does..."
					rows="2"
				></textarea>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="rule-effect">Effect *</label>
					<select id="rule-effect" bind:value={ruleForm.effect}>
						<option value="allow">Allow</option>
						<option value="deny">Deny</option>
					</select>
				</div>
				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={ruleForm.enabled} />
						Enabled
					</label>
				</div>
			</div>

			<!-- Resource Types -->
			<div class="form-group">
				<label>Resource Types</label>
				<div class="tag-input">
					<input
						type="text"
						bind:value={resourceTypeInput}
						placeholder="e.g., user, document, organization"
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addResourceType())}
					/>
					<button type="button" class="btn-add" onclick={addResourceType}>Add</button>
				</div>
				{#if ruleForm.resource_types.length > 0}
					<div class="tags">
						{#each ruleForm.resource_types as type (type)}
							<span class="tag removable">
								{type}
								<button onclick={() => removeResourceType(type)}>×</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="form-group">
				<label>Actions</label>
				<div class="tag-input">
					<input
						type="text"
						bind:value={actionInput}
						placeholder="e.g., read, write, delete, manage"
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addAction())}
					/>
					<button type="button" class="btn-add" onclick={addAction}>Add</button>
				</div>
				{#if ruleForm.actions.length > 0}
					<div class="tags">
						{#each ruleForm.actions as action (action)}
							<span class="tag removable">
								{action}
								<button onclick={() => removeAction(action)}>×</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Conditions -->
			<div class="form-group">
				<label>Conditions</label>
				<button type="button" class="btn-secondary btn-small" onclick={openConditionBuilder}>
					+ Add Condition
				</button>
				{#if ruleForm.conditions.length > 0}
					<div class="conditions-builder">
						{#each ruleForm.conditions as condition, i (i)}
							<div class="condition-item">
								<span class="condition-text">{formatCondition(condition)}</span>
								<button class="btn-remove" onclick={() => removeCondition(i)}>×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showRuleDialog = false)}>Cancel</button>
				<button class="btn-primary" onclick={saveRule} disabled={saving}>
					{saving ? 'Saving...' : editingRule ? 'Update' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Condition Builder Dialog -->
{#if showConditionDialog}
	<div class="dialog-overlay" onclick={() => (showConditionDialog = false)}>
		<div class="dialog dialog-medium" onclick={(e) => e.stopPropagation()}>
			<h2>Add Condition</h2>

			{#if !selectedCategory}
				<!-- Category Selection -->
				<div class="category-grid">
					{#each categories as category (category.id)}
						<button class="category-card" onclick={() => selectCategory(category.id)}>
							<span class="category-icon">{getCategoryIcon(category.id)}</span>
							<span class="category-label">{category.label}</span>
						</button>
					{/each}
				</div>
			{:else if !selectedConditionType}
				<!-- Condition Type Selection -->
				<button class="btn-back" onclick={() => selectCategory('')}>← Back to categories</button>
				<div class="type-list">
					{#each conditionTypes.filter((t) => t.category === selectedCategory) as type (type.type)}
						<button class="type-card" onclick={() => selectConditionType(type.type)}>
							<span class="type-label">{type.label}</span>
							<span class="type-description">{type.description}</span>
						</button>
					{/each}
				</div>
			{:else}
				<!-- Parameter Input -->
				{@const typeInfo = conditionTypes.find((t) => t.type === selectedConditionType)}
				<button class="btn-back" onclick={() => selectConditionType('')}>← Back to types</button>

				{#if typeInfo}
					<h3 class="param-title">{typeInfo.label}</h3>
					<p class="param-description">{typeInfo.description}</p>

					{#each typeInfo.params as param (param.name)}
						<div class="form-group">
							<label for="param-{param.name}">{param.label}{param.required ? ' *' : ''}</label>
							{#if param.type === 'string'}
								<input
									id="param-{param.name}"
									type="text"
									bind:value={conditionParams[param.name]}
								/>
							{:else if param.type === 'number'}
								<input
									id="param-{param.name}"
									type="number"
									bind:value={conditionParams[param.name]}
								/>
							{:else if param.type === 'string[]'}
								<input
									id="param-{param.name}"
									type="text"
									placeholder="Comma-separated values"
									oninput={(e) => {
										conditionParams[param.name] = e.currentTarget.value
											.split(',')
											.map((s) => s.trim())
											.filter(Boolean);
									}}
								/>
							{:else if param.type === 'number[]'}
								<input
									id="param-{param.name}"
									type="text"
									placeholder="Comma-separated numbers"
									oninput={(e) => {
										conditionParams[param.name] = e.currentTarget.value
											.split(',')
											.map((s) => parseInt(s.trim()))
											.filter((n) => !isNaN(n));
									}}
								/>
							{/if}
						</div>
					{/each}

					<div class="dialog-actions">
						<button class="btn-secondary" onclick={() => (showConditionDialog = false)}>
							Cancel
						</button>
						<button class="btn-primary" onclick={addCondition}>Add Condition</button>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && ruleToDelete}
	<div class="dialog-overlay" onclick={() => (showDeleteDialog = false)}>
		<div class="dialog dialog-small" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Policy Rule</h2>

			{#if deleteError}
				<div class="dialog-error">{deleteError}</div>
			{/if}

			<p>
				Are you sure you want to delete the policy rule <strong>{ruleToDelete.name}</strong>?
			</p>
			<p class="warning-text">This action cannot be undone.</p>

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showDeleteDialog = false)}>Cancel</button>
				<button class="btn-danger" onclick={confirmDelete} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Simulate Dialog -->
{#if showSimulateDialog}
	<div class="dialog-overlay" onclick={() => (showSimulateDialog = false)}>
		<div class="dialog dialog-large" onclick={(e) => e.stopPropagation()}>
			<h2>Policy Simulator</h2>
			<p class="dialog-description">Test how policies evaluate against a given context.</p>

			{#if simulationError}
				<div class="dialog-error">{simulationError}</div>
			{/if}

			<div class="simulation-form">
				<h3>Subject</h3>
				<div class="form-row">
					<div class="form-group">
						<label for="sim-subject-id">Subject ID *</label>
						<input
							id="sim-subject-id"
							type="text"
							bind:value={simulationContext.subject.id}
							placeholder="user_123"
						/>
					</div>
					<div class="form-group">
						<label for="sim-subject-org">Organization ID</label>
						<input
							id="sim-subject-org"
							type="text"
							bind:value={simulationContext.subject.orgId}
							placeholder="org_456"
						/>
					</div>
				</div>

				<h3>Resource</h3>
				<div class="form-row">
					<div class="form-group">
						<label for="sim-resource-type">Resource Type *</label>
						<input
							id="sim-resource-type"
							type="text"
							bind:value={simulationContext.resource.type}
							placeholder="document"
						/>
					</div>
					<div class="form-group">
						<label for="sim-resource-id">Resource ID *</label>
						<input
							id="sim-resource-id"
							type="text"
							bind:value={simulationContext.resource.id}
							placeholder="doc_789"
						/>
					</div>
				</div>

				<h3>Action</h3>
				<div class="form-group">
					<label for="sim-action">Action Name *</label>
					<input
						id="sim-action"
						type="text"
						bind:value={simulationContext.action.name}
						placeholder="read, write, delete..."
					/>
				</div>

				<h3>Environment (Optional)</h3>
				<div class="form-row">
					<div class="form-group">
						<label for="sim-env-ip">Client IP</label>
						<input
							id="sim-env-ip"
							type="text"
							bind:value={simulationContext.environment!.clientIp}
							placeholder="192.168.1.1"
						/>
					</div>
					<div class="form-group">
						<label for="sim-env-country">Country Code</label>
						<input
							id="sim-env-country"
							type="text"
							bind:value={simulationContext.environment!.countryCode}
							placeholder="US, JP, DE..."
						/>
					</div>
				</div>
			</div>

			{#if simulationResult}
				<div
					class="simulation-result"
					class:allowed={simulationResult.allowed}
					class:denied={!simulationResult.allowed}
				>
					<div class="result-header">
						<span class="result-icon">{simulationResult.allowed ? '✓' : '✗'}</span>
						<span class="result-text">{simulationResult.allowed ? 'ALLOWED' : 'DENIED'}</span>
					</div>
					<div class="result-details">
						<p><strong>Reason:</strong> {simulationResult.reason}</p>
						{#if simulationResult.decided_by}
							<p><strong>Decided by:</strong> {simulationResult.decided_by}</p>
						{/if}
						<p><strong>Rules evaluated:</strong> {simulationResult.evaluated_rules}</p>
					</div>
				</div>
			{/if}

			<div class="dialog-actions">
				<button class="btn-secondary" onclick={() => (showSimulateDialog = false)}>Close</button>
				<button class="btn-primary" onclick={runSimulation} disabled={simulating}>
					{simulating ? 'Simulating...' : 'Run Simulation'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.policies-page {
		padding: 24px;
		max-width: 1200px;
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

	.filter-bar {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
		flex-wrap: wrap;
		align-items: center;
	}

	.filter-bar input,
	.filter-bar select {
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
	}

	.filter-bar input {
		width: 250px;
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

	/* Rules List */
	.rules-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.rule-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 20px;
		transition: box-shadow 0.2s;
	}

	.rule-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.rule-card.disabled {
		opacity: 0.6;
		background: #f9fafb;
	}

	.rule-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.rule-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.rule-priority {
		font-family: monospace;
		font-size: 14px;
		color: #6b7280;
		background: #f3f4f6;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.rule-name {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.effect-badge {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.effect-badge.success {
		background-color: #dcfce7;
		color: #166534;
	}

	.effect-badge.danger {
		background-color: #fef2f2;
		color: #b91c1c;
	}

	.status-badge.disabled {
		background-color: #f3f4f6;
		color: #6b7280;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
	}

	.rule-actions {
		display: flex;
		gap: 8px;
	}

	.btn-toggle {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 1px solid #d1d5db;
		background: white;
		cursor: pointer;
		font-size: 14px;
	}

	.btn-action {
		padding: 6px 12px;
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

	.rule-description {
		color: #6b7280;
		font-size: 14px;
		margin: 0 0 12px 0;
	}

	.rule-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.detail-item {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.detail-item.conditions {
		flex-direction: column;
	}

	.detail-label {
		font-size: 13px;
		color: #6b7280;
		min-width: 80px;
	}

	.detail-value {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag {
		display: inline-block;
		padding: 2px 8px;
		background-color: #e5e7eb;
		border-radius: 4px;
		font-size: 12px;
		color: #374151;
	}

	.conditions-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.condition-tag {
		display: inline-block;
		padding: 4px 10px;
		background-color: #dbeafe;
		color: #1e40af;
		border-radius: 4px;
		font-size: 12px;
	}

	.rule-meta {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid #e5e7eb;
		font-size: 12px;
		color: #9ca3af;
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

	.btn-secondary.btn-small {
		padding: 6px 12px;
		font-size: 13px;
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
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-small {
		width: 400px;
		max-width: 90vw;
	}

	.dialog-medium {
		width: 500px;
		max-width: 90vw;
	}

	.dialog-large {
		width: 700px;
		max-width: 90vw;
	}

	.dialog h2 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
	}

	.dialog h3 {
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		margin: 16px 0 8px 0;
	}

	.dialog-description {
		color: #6b7280;
		font-size: 14px;
		margin: 0 0 16px 0;
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

	.form-row {
		display: flex;
		gap: 16px;
	}

	.form-group {
		margin-bottom: 16px;
		flex: 1;
	}

	.form-group.flex-2 {
		flex: 2;
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

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		margin-top: 28px;
	}

	.tag-input {
		display: flex;
		gap: 8px;
	}

	.tag-input input {
		flex: 1;
	}

	.btn-add {
		padding: 10px 16px;
		background-color: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.tag.removable {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tag.removable button {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.conditions-builder {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.condition-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background-color: #dbeafe;
		border-radius: 6px;
	}

	.condition-text {
		font-size: 13px;
		color: #1e40af;
	}

	.btn-remove {
		background: none;
		border: none;
		color: #1e40af;
		cursor: pointer;
		font-size: 16px;
		padding: 0;
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

	/* Category/Type Selection */
	.category-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.category-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 20px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.category-card:hover {
		background: #f3f4f6;
		border-color: #3b82f6;
	}

	.category-icon {
		font-size: 24px;
	}

	.category-label {
		font-size: 14px;
		font-weight: 500;
	}

	.btn-back {
		background: none;
		border: none;
		color: #3b82f6;
		cursor: pointer;
		font-size: 14px;
		padding: 0;
		margin-bottom: 16px;
	}

	.type-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.type-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 12px 16px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.type-card:hover {
		background: #f3f4f6;
		border-color: #3b82f6;
	}

	.type-label {
		font-size: 14px;
		font-weight: 500;
	}

	.type-description {
		font-size: 12px;
		color: #6b7280;
	}

	.param-title {
		margin-top: 0;
	}

	.param-description {
		color: #6b7280;
		font-size: 14px;
		margin-bottom: 16px;
	}

	/* Simulation */
	.simulation-form h3 {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #e5e7eb;
	}

	.simulation-form h3:first-of-type {
		margin-top: 0;
		padding-top: 0;
		border-top: none;
	}

	.simulation-result {
		margin-top: 24px;
		padding: 16px;
		border-radius: 8px;
	}

	.simulation-result.allowed {
		background-color: #dcfce7;
		border: 1px solid #86efac;
	}

	.simulation-result.denied {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.result-icon {
		font-size: 20px;
	}

	.result-text {
		font-size: 16px;
		font-weight: 600;
	}

	.simulation-result.allowed .result-text {
		color: #166534;
	}

	.simulation-result.denied .result-text {
		color: #b91c1c;
	}

	.result-details p {
		margin: 4px 0;
		font-size: 14px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 16px;
		}

		.form-row {
			flex-direction: column;
		}

		.category-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
