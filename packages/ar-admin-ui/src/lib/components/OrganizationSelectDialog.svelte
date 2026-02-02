<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Modal from './Modal.svelte';
	import OrganizationTree from './OrganizationTree.svelte';
	import {
		adminOrganizationsAPI,
		type OrganizationNode,
		type OrganizationHierarchyResponse
	} from '$lib/api/admin-organizations';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSelect: (org: OrganizationNode) => void;
		excludeIds?: string[];
		title?: string;
	}

	let { open, onClose, onSelect, excludeIds = [], title = 'Select Organization' }: Props = $props();

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let hierarchyData = $state<OrganizationHierarchyResponse | null>(null);
	let expandedNodes = new SvelteSet<string>();
	let selectedOrg = $state<OrganizationNode | null>(null);
	let searchQuery = $state('');
	let highlightIds = new SvelteSet<string>();

	// Load hierarchy when dialog opens
	$effect(() => {
		if (open) {
			loadHierarchy();
		} else {
			// Reset state when closed
			selectedOrg = null;
			searchQuery = '';
			highlightIds.clear();
		}
	});

	async function loadHierarchy() {
		loading = true;
		error = null;
		try {
			// Get root organizations first
			const orgList = await adminOrganizationsAPI.listOrganizations({ limit: 100 });

			// Find root orgs (no parent)
			const rootOrgs = orgList.organizations.filter((org) => !org.parent_org_id);

			if (rootOrgs.length === 0) {
				error = 'No organizations found';
				return;
			}

			// Get hierarchy starting from first root org
			// In practice, you might want to load multiple roots
			const rootOrg = rootOrgs[0];
			hierarchyData = await adminOrganizationsAPI.getHierarchy(rootOrg.id);

			// Expand first level by default
			expandedNodes.clear();
			expandedNodes.add(hierarchyData.organization.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load organizations';
		} finally {
			loading = false;
		}
	}

	async function handleSearch() {
		if (!searchQuery.trim()) {
			highlightIds.clear();
			return;
		}

		try {
			const results = await adminOrganizationsAPI.listOrganizations({
				search: searchQuery.trim(),
				limit: 50
			});

			// Highlight matching organizations
			highlightIds.clear();
			for (const org of results.organizations) {
				highlightIds.add(org.id);
			}

			// Expand paths to highlighted nodes
			if (hierarchyData) {
				for (const org of results.organizations) {
					expandPathToNode(hierarchyData.organization, org.id, expandedNodes);
				}
			}
		} catch {
			// Silently fail search
		}
	}

	function expandPathToNode(
		node: OrganizationNode,
		targetId: string,
		expanded: Set<string>
	): boolean {
		if (node.id === targetId) {
			return true;
		}

		if (node.children) {
			for (const child of node.children) {
				if (expandPathToNode(child, targetId, expanded)) {
					expanded.add(node.id);
					return true;
				}
			}
		}

		return false;
	}

	function handleToggle(nodeId: string, isExpanded: boolean) {
		if (isExpanded) {
			expandedNodes.add(nodeId);
		} else {
			expandedNodes.delete(nodeId);
		}
	}

	function handleNodeSelect(node: OrganizationNode) {
		// Check if excluded
		if (excludeIds.includes(node.id)) {
			return;
		}
		selectedOrg = node;
	}

	function handleConfirm() {
		if (selectedOrg) {
			onSelect(selectedOrg);
			onClose();
		}
	}

	// Debounce search
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			handleSearch();
		}, 300);
	}

	// Cleanup timer on unmount or dialog close
	$effect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
				searchTimeout = null;
			}
		};
	});
</script>

<Modal {open} {onClose} {title} size="md">
	<!-- Search -->
	<div class="search-box">
		<input
			type="text"
			placeholder="Search organizations..."
			value={searchQuery}
			oninput={handleSearchInput}
		/>
	</div>

	<!-- Tree -->
	<div class="tree-container">
		{#if loading}
			<div class="loading">Loading organizations...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if hierarchyData}
			<OrganizationTree
				node={hierarchyData.organization}
				{expandedNodes}
				selectedId={selectedOrg?.id ?? null}
				selectable={true}
				onSelect={handleNodeSelect}
				onToggle={handleToggle}
				{highlightIds}
			/>
		{/if}
	</div>

	<!-- Selection info -->
	{#if selectedOrg}
		<div class="selection-info">
			<span class="label">Selected:</span>
			<span class="value">{selectedOrg.display_name || selectedOrg.name}</span>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn btn-secondary" onclick={onClose}> Cancel </button>
		<button class="btn btn-primary" onclick={handleConfirm} disabled={!selectedOrg}>
			Select
		</button>
	{/snippet}
</Modal>

<style>
	.search-box {
		margin-bottom: 12px;
	}

	.search-box input {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 14px;
	}

	.search-box input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.tree-container {
		flex: 1;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		min-height: 200px;
		max-height: 300px;
	}

	.loading,
	.error {
		padding: 24px;
		text-align: center;
		color: #6b7280;
	}

	.error {
		color: #dc2626;
	}

	.selection-info {
		margin-top: 12px;
		padding: 8px 12px;
		background-color: #f0f9ff;
		border-radius: 6px;
		font-size: 14px;
	}

	.selection-info .label {
		color: #6b7280;
		margin-right: 8px;
	}

	.selection-info .value {
		color: #1e40af;
		font-weight: 500;
	}

	.btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-secondary {
		background-color: white;
		border: 1px solid #d1d5db;
		color: #374151;
	}

	.btn-secondary:hover {
		background-color: #f9fafb;
	}

	.btn-primary {
		background-color: #2563eb;
		border: 1px solid #2563eb;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
