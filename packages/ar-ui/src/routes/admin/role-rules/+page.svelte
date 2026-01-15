<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminRoleRulesAPI,
		type RoleAssignmentRule,
		type RuleCondition,
		type CompoundCondition,
		type RuleAction,
		createEqualsCondition,
		createAssignRoleAction
	} from '$lib/api/admin-role-rules';

	let rules: RoleAssignmentRule[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let total = $state(0);

	// Create dialog state
	let showCreateDialog = $state(false);
	let creating = $state(false);
	let createError = $state('');
	let newName = $state('');
	let newDescription = $state('');
	let newRoleId = $state('');
	let newClaimName = $state('');
	let newClaimValue = $state('');
	let newPriority = $state(0);
	let newStopProcessing = $state(false);

	// Delete confirmation dialog state
	let showDeleteDialog = $state(false);
	let ruleToDelete: RoleAssignmentRule | null = $state(null);
	let deleting = $state(false);
	let deleteError = $state('');

	// Test dialog state
	let showTestDialog = $state(false);
	let ruleToTest: RoleAssignmentRule | null = $state(null);
	let testing = $state(false);
	let testError = $state('');
	let testClaims = $state('{}');
	let testResult: { matched: boolean; actions_applied: RuleAction[] } | null = $state(null);

	async function loadRules() {
		loading = true;
		error = '';

		try {
			const response = await adminRoleRulesAPI.list({ limit: 50 });
			rules = response.rules;
			total = response.total;
		} catch (err) {
			console.error('Failed to load role assignment rules:', err);
			error = 'Failed to load role assignment rules';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadRules();
	});

	function openCreateDialog() {
		newName = '';
		newDescription = '';
		newRoleId = '';
		newClaimName = 'email';
		newClaimValue = '';
		newPriority = 0;
		newStopProcessing = false;
		createError = '';
		showCreateDialog = true;
	}

	function closeCreateDialog() {
		showCreateDialog = false;
		createError = '';
	}

	async function confirmCreate() {
		if (!newName.trim() || !newRoleId.trim() || !newClaimName.trim() || !newClaimValue.trim()) {
			createError = 'Name, Role ID, Claim Name, and Claim Value are required';
			return;
		}

		creating = true;
		createError = '';

		try {
			const condition = createEqualsCondition(newClaimName.trim(), newClaimValue.trim());
			const action = createAssignRoleAction(newRoleId.trim());

			await adminRoleRulesAPI.create({
				name: newName.trim(),
				description: newDescription.trim() || undefined,
				role_id: newRoleId.trim(),
				condition,
				actions: [action],
				priority: newPriority,
				stop_processing: newStopProcessing,
				is_active: true
			});
			showCreateDialog = false;
			await loadRules();
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create rule';
		} finally {
			creating = false;
		}
	}

	function openDeleteDialog(rule: RoleAssignmentRule, event: Event) {
		event.stopPropagation();
		ruleToDelete = rule;
		deleteError = '';
		showDeleteDialog = true;
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		ruleToDelete = null;
		deleteError = '';
	}

	async function confirmDelete() {
		if (!ruleToDelete) return;

		deleting = true;
		deleteError = '';

		try {
			await adminRoleRulesAPI.delete(ruleToDelete.id);
			showDeleteDialog = false;
			ruleToDelete = null;
			await loadRules();
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete rule';
		} finally {
			deleting = false;
		}
	}

	function openTestDialog(rule: RoleAssignmentRule, event: Event) {
		event.stopPropagation();
		ruleToTest = rule;
		testError = '';
		testClaims = '{\n  "email": "user@example.com",\n  "groups": ["admin"]\n}';
		testResult = null;
		showTestDialog = true;
	}

	function closeTestDialog() {
		showTestDialog = false;
		ruleToTest = null;
		testError = '';
		testResult = null;
	}

	async function runTest() {
		if (!ruleToTest) return;

		testing = true;
		testError = '';
		testResult = null;

		try {
			const claims = JSON.parse(testClaims);
			const result = await adminRoleRulesAPI.testRule(ruleToTest.id, { claims });
			testResult = result;
		} catch (err) {
			if (err instanceof SyntaxError) {
				testError = 'Invalid JSON format for claims';
			} else {
				testError = err instanceof Error ? err.message : 'Failed to test rule';
			}
		} finally {
			testing = false;
		}
	}

	async function toggleActive(rule: RoleAssignmentRule, event: Event) {
		event.stopPropagation();
		try {
			await adminRoleRulesAPI.update(rule.id, {
				is_active: !rule.is_active
			});
			await loadRules();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update rule';
		}
	}

	function formatCondition(condition: RuleCondition | CompoundCondition): string {
		if ('operator' in condition && ('and' === condition.operator || 'or' === condition.operator)) {
			const compound = condition as CompoundCondition;
			return `${compound.operator.toUpperCase()}(${compound.conditions.length} conditions)`;
		}
		const simple = condition as RuleCondition;
		const value = Array.isArray(simple.value) ? simple.value.join(', ') : simple.value;
		return `${simple.claim} ${simple.operator} "${value}"`;
	}

	function getScopeBadgeStyle(scope: string): string {
		switch (scope) {
			case 'global':
				return 'background-color: #dbeafe; color: #1e40af;';
			case 'organization':
				return 'background-color: #e0e7ff; color: #3730a3;';
			case 'client':
				return 'background-color: #fce7f3; color: #be185d;';
			default:
				return 'background-color: #f3f4f6; color: #374151;';
		}
	}

	function getActiveBadgeStyle(active: boolean): string {
		if (active) {
			return 'background-color: #d1fae5; color: #065f46;';
		}
		return 'background-color: #e5e7eb; color: #374151;';
	}
</script>

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
			Role Assignment Rules
		</h1>
		<button
			onclick={openCreateDialog}
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
			Add Rule
		</button>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		Configure automatic role assignment rules based on IdP claims. When users authenticate via
		external identity providers, their claims are evaluated against these rules to automatically
		assign roles.
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
	{:else if rules.length === 0}
		<div
			style="text-align: center; padding: 48px; color: #6b7280; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0;">No role assignment rules configured.</p>
			<p style="margin: 0 0 24px 0; font-size: 14px;">
				Add a rule to automatically assign roles to users based on their IdP claims.
			</p>
			<button
				onclick={openCreateDialog}
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
				Add Your First Rule
			</button>
		</div>
	{:else}
		<div style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">
			Showing {rules.length} of {total} rules
		</div>

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
							Condition
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Role
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Scope
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Priority
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Status
						</th>
						<th
							style="text-align: right; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rules as rule (rule.id)}
						<tr style="border-bottom: 1px solid #e5e7eb;">
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<div style="font-weight: 500; color: #1f2937;">{rule.name}</div>
								{#if rule.description}
									<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
										{rule.description}
									</div>
								{/if}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<code
									style="font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;"
								>
									{formatCondition(rule.condition)}
								</code>
							</td>
							<td
								style="padding: 12px 16px; font-size: 14px; font-family: monospace; color: #374151;"
							>
								{rule.role_id}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<span
									style="
										display: inline-block;
										padding: 4px 8px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										{getScopeBadgeStyle(rule.scope_type)}
									"
								>
									{rule.scope_type}
								</span>
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								{rule.priority}
								{#if rule.stop_processing}
									<span style="font-size: 11px; color: #f59e0b; margin-left: 4px;">⬛ stops</span>
								{/if}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<span
									style="
										display: inline-block;
										padding: 4px 8px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										{getActiveBadgeStyle(rule.is_active)}
									"
								>
									{rule.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td style="padding: 12px 16px; text-align: right;">
								<div style="display: flex; justify-content: flex-end; gap: 8px;">
									<button
										onclick={(e) => openTestDialog(rule, e)}
										style="
											padding: 6px 12px;
											background-color: #e0e7ff;
											color: #3730a3;
											border: none;
											border-radius: 4px;
											cursor: pointer;
											font-size: 13px;
										"
									>
										Test
									</button>
									<button
										onclick={(e) => toggleActive(rule, e)}
										style="
											padding: 6px 12px;
											background-color: #f3f4f6;
											color: #374151;
											border: none;
											border-radius: 4px;
											cursor: pointer;
											font-size: 13px;
										"
									>
										{rule.is_active ? 'Disable' : 'Enable'}
									</button>
									<button
										onclick={(e) => openDeleteDialog(rule, e)}
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
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeCreateDialog}
		onkeydown={(e) => e.key === 'Escape' && closeCreateDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;">
				Add Role Assignment Rule
			</h2>

			{#if createError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{createError}
				</div>
			{/if}

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Rule Name
				</label>
				<input
					type="text"
					bind:value={newName}
					placeholder="e.g., Assign Admin for IT Staff"
					style="
						width: 100%;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						box-sizing: border-box;
					"
				/>
			</div>

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Description (optional)
				</label>
				<input
					type="text"
					bind:value={newDescription}
					placeholder="Brief description of the rule"
					style="
						width: 100%;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						box-sizing: border-box;
					"
				/>
			</div>

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Role ID to Assign
				</label>
				<input
					type="text"
					bind:value={newRoleId}
					placeholder="e.g., admin, viewer, editor"
					style="
						width: 100%;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						box-sizing: border-box;
					"
				/>
			</div>

			<div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
				<h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #374151;">
					Condition (Simple Match)
				</h3>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
					<div>
						<label
							style="display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;"
						>
							Claim Name
						</label>
						<input
							type="text"
							bind:value={newClaimName}
							placeholder="e.g., email, groups, department"
							style="
								width: 100%;
								padding: 8px 10px;
								border: 1px solid #d1d5db;
								border-radius: 6px;
								font-size: 14px;
								box-sizing: border-box;
							"
						/>
					</div>
					<div>
						<label
							style="display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;"
						>
							Claim Value
						</label>
						<input
							type="text"
							bind:value={newClaimValue}
							placeholder="e.g., *@company.com, IT"
							style="
								width: 100%;
								padding: 8px 10px;
								border: 1px solid #d1d5db;
								border-radius: 6px;
								font-size: 14px;
								box-sizing: border-box;
							"
						/>
					</div>
				</div>
				<p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">
					This creates a simple "equals" condition. For complex conditions, use the API directly.
				</p>
			</div>

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
				<div>
					<label
						style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
					>
						Priority
					</label>
					<input
						type="number"
						bind:value={newPriority}
						min="0"
						max="1000"
						style="
							width: 100%;
							padding: 10px 12px;
							border: 1px solid #d1d5db;
							border-radius: 6px;
							font-size: 14px;
							box-sizing: border-box;
						"
					/>
					<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
						Higher priority rules are evaluated first
					</p>
				</div>
			</div>

			<div style="margin-bottom: 24px;">
				<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
					<input
						type="checkbox"
						bind:checked={newStopProcessing}
						style="width: 16px; height: 16px;"
					/>
					<span style="font-size: 14px; color: #374151;"
						>Stop processing subsequent rules if matched</span
					>
				</label>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeCreateDialog}
					disabled={creating}
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
					onclick={confirmCreate}
					disabled={creating}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {creating ? 0.7 : 1};
					"
				>
					{creating ? 'Creating...' : 'Create Rule'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Test Dialog -->
{#if showTestDialog && ruleToTest}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeTestDialog}
		onkeydown={(e) => e.key === 'Escape' && closeTestDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;">
				Test Rule: {ruleToTest.name}
			</h2>

			{#if testError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{testError}
				</div>
			{/if}

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Test Claims (JSON)
				</label>
				<textarea
					bind:value={testClaims}
					rows="6"
					style="
						width: 100%;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						font-family: monospace;
						box-sizing: border-box;
						resize: vertical;
					"
				></textarea>
				<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
					Enter the claims object that would be received from the IdP
				</p>
			</div>

			{#if testResult}
				<div
					style="
						padding: 16px;
						border-radius: 6px;
						margin-bottom: 16px;
						{testResult.matched
						? 'background-color: #d1fae5; border: 1px solid #22c55e;'
						: 'background-color: #fee2e2; border: 1px solid #ef4444;'}
					"
				>
					<div
						style="font-weight: 600; margin-bottom: 8px; {testResult.matched
							? 'color: #065f46;'
							: 'color: #b91c1c;'}"
					>
						{testResult.matched ? '✓ Rule Matched' : '✗ Rule Did Not Match'}
					</div>
					{#if testResult.matched && testResult.actions_applied.length > 0}
						<div style="font-size: 14px; color: #374151;">
							<strong>Actions to apply:</strong>
							<ul style="margin: 8px 0 0 0; padding-left: 20px;">
								{#each testResult.actions_applied as action, i (i)}
									<li>{action.type}: {action.target}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeTestDialog}
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
				<button
					onclick={runTest}
					disabled={testing}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {testing ? 0.7 : 1};
					"
				>
					{testing ? 'Testing...' : 'Run Test'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog && ruleToDelete}
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
				Delete Role Assignment Rule
			</h2>

			{#if deleteError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{deleteError}
				</div>
			{/if}

			<p style="color: #6b7280; margin: 0 0 16px 0;">
				Are you sure you want to delete this role assignment rule? Users will no longer be
				automatically assigned the specified role based on this rule.
			</p>

			<div
				style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 24px;"
			>
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
					<strong>Rule:</strong>
					{ruleToDelete.name}
				</p>
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
					<strong>Role:</strong>
					{ruleToDelete.role_id}
				</p>
				<p style="margin: 0; font-size: 14px; color: #374151;">
					<strong>Condition:</strong>
					<code style="font-size: 12px;">{formatCondition(ruleToDelete.condition)}</code>
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
					{deleting ? 'Deleting...' : 'Delete Rule'}
				</button>
			</div>
		</div>
	</div>
{/if}
