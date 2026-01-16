<script lang="ts">
	import {
		adminAccessTraceAPI,
		type AccessTraceEntry,
		type AccessTraceStats,
		type TimelineDataPoint,
		getDecisionColor,
		getDecisionLabel,
		formatResolvedVia,
		formatPermission,
		getPeriodLabel,
		formatTimestamp
	} from '$lib/api/admin-access-trace';

	// =============================================================================
	// State
	// =============================================================================

	let entries = $state<AccessTraceEntry[]>([]);
	let stats = $state<AccessTraceStats | null>(null);
	let timeline = $state<TimelineDataPoint[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Filters
	let selectedPeriod = $state<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
	let filterDecision = $state<'' | 'allow' | 'deny'>('');
	let filterSubject = $state('');
	let filterPermission = $state('');

	// Pagination
	let currentPage = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	const pageSize = 50;

	// Detail view
	let selectedEntry = $state<AccessTraceEntry | null>(null);
	let showDetailDialog = $state(false);

	// =============================================================================
	// Data Loading
	// =============================================================================

	async function loadData() {
		loading = true;
		error = '';

		try {
			// Calculate time range based on period
			const now = Math.floor(Date.now() / 1000);
			let startTime: number;

			switch (selectedPeriod) {
				case '1h':
					startTime = now - 3600;
					break;
				case '6h':
					startTime = now - 6 * 3600;
					break;
				case '24h':
					startTime = now - 24 * 3600;
					break;
				case '7d':
					startTime = now - 7 * 24 * 3600;
					break;
				case '30d':
					startTime = now - 30 * 24 * 3600;
					break;
				default:
					startTime = now - 24 * 3600;
			}

			// Load entries, stats, and timeline in parallel
			const [entriesResult, statsResult, timelineResult] = await Promise.all([
				adminAccessTraceAPI.listEntries({
					start_time: startTime,
					end_time: now,
					allowed: filterDecision === '' ? undefined : filterDecision === 'allow',
					subject_id: filterSubject || undefined,
					permission: filterPermission || undefined,
					page: currentPage,
					limit: pageSize
				}),
				adminAccessTraceAPI.getStats(selectedPeriod),
				adminAccessTraceAPI.getTimeline(selectedPeriod)
			]);

			entries = entriesResult.entries;
			totalPages = entriesResult.pagination.total_pages;
			total = entriesResult.pagination.total;
			stats = statsResult;
			timeline = timelineResult.data;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load access trace data';
		} finally {
			loading = false;
		}
	}

	// Load on mount and when filters change
	$effect(() => {
		// Track dependencies by using them in a condition
		const _deps = [selectedPeriod, filterDecision, currentPage];
		if (_deps) {
			loadData();
		}
	});

	function handleSearch() {
		currentPage = 1;
		loadData();
	}

	function handlePeriodChange(period: '1h' | '6h' | '24h' | '7d' | '30d') {
		selectedPeriod = period;
		currentPage = 1;
	}

	function viewDetail(entry: AccessTraceEntry) {
		selectedEntry = entry;
		showDetailDialog = true;
	}

	function closeDetail() {
		showDetailDialog = false;
		selectedEntry = null;
	}

	// Calculate simple timeline chart bars
	function getTimelineBarHeight(value: number, max: number): number {
		if (max === 0) return 0;
		return Math.max(2, (value / max) * 100);
	}

	function getTimelineMax(): number {
		return Math.max(...timeline.map((d) => d.total), 1);
	}
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Access Trace</h1>
		<p class="subtitle">Permission check audit logs and access decision history</p>
	</header>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	<!-- Stats Overview -->
	{#if stats}
		<section class="stats-section">
			<div class="stats-grid">
				<div class="stat-card">
					<span class="stat-label">Total Checks</span>
					<span class="stat-value">{stats.total.toLocaleString()}</span>
					<span class="stat-period">{getPeriodLabel(stats.period)}</span>
				</div>
				<div class="stat-card success">
					<span class="stat-label">Allowed</span>
					<span class="stat-value">{stats.allowed.toLocaleString()}</span>
					<span class="stat-rate">{stats.allow_rate}%</span>
				</div>
				<div class="stat-card danger">
					<span class="stat-label">Denied</span>
					<span class="stat-value">{stats.denied.toLocaleString()}</span>
					<span class="stat-rate">{100 - stats.allow_rate}%</span>
				</div>
			</div>
		</section>
	{/if}

	<!-- Timeline Chart (simple bar chart) -->
	{#if timeline.length > 0}
		<section class="timeline-section">
			<h2>Access Timeline</h2>
			<div class="timeline-chart">
				{#each timeline as point (point.timestamp)}
					<div class="timeline-bar-group" title={formatTimestamp(point.timestamp)}>
						<div
							class="timeline-bar allowed"
							style="height: {getTimelineBarHeight(point.allowed, getTimelineMax())}%"
						></div>
						<div
							class="timeline-bar denied"
							style="height: {getTimelineBarHeight(point.denied, getTimelineMax())}%"
						></div>
					</div>
				{/each}
			</div>
			<div class="timeline-legend">
				<span class="legend-item allowed">Allowed</span>
				<span class="legend-item denied">Denied</span>
			</div>
		</section>
	{/if}

	<!-- Filters -->
	<section class="filters-section">
		<div class="period-tabs">
			{#each ['1h', '6h', '24h', '7d', '30d'] as period (period)}
				<button
					class="period-tab"
					class:active={selectedPeriod === period}
					onclick={() => handlePeriodChange(period as '1h' | '6h' | '24h' | '7d' | '30d')}
				>
					{getPeriodLabel(period)}
				</button>
			{/each}
		</div>

		<div class="filter-row">
			<div class="filter-group">
				<label for="filter-decision">Decision</label>
				<select id="filter-decision" bind:value={filterDecision} onchange={handleSearch}>
					<option value="">All</option>
					<option value="allow">Allowed</option>
					<option value="deny">Denied</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="filter-subject">Subject ID</label>
				<input
					id="filter-subject"
					type="text"
					placeholder="Filter by subject..."
					bind:value={filterSubject}
					onkeyup={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>

			<div class="filter-group">
				<label for="filter-permission">Permission</label>
				<input
					id="filter-permission"
					type="text"
					placeholder="Filter by permission..."
					bind:value={filterPermission}
					onkeyup={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>

			<button class="btn-search" onclick={handleSearch}>Search</button>
		</div>
	</section>

	<!-- Entries Table -->
	<section class="entries-section">
		<div class="section-header">
			<h2>Access Decisions</h2>
			<span class="entry-count">{total.toLocaleString()} entries</span>
		</div>

		{#if loading}
			<div class="loading-state">Loading...</div>
		{:else if entries.length === 0}
			<div class="empty-state">No access trace entries found for the selected filters.</div>
		{:else}
			<div class="table-container">
				<table class="entries-table">
					<thead>
						<tr>
							<th>Time</th>
							<th>Subject</th>
							<th>Permission</th>
							<th>Decision</th>
							<th>Resolved Via</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as entry (entry.id)}
							<tr class:denied={!entry.allowed}>
								<td class="col-time">{formatTimestamp(entry.checked_at)}</td>
								<td class="col-subject">
									<code>{entry.subject_id}</code>
								</td>
								<td class="col-permission">
									<code>{formatPermission(entry.permission, entry.permission_parsed)}</code>
								</td>
								<td class="col-decision">
									<span class="badge badge-{getDecisionColor(entry.allowed)}">
										{getDecisionLabel(entry.allowed)}
									</span>
								</td>
								<td class="col-resolved">{formatResolvedVia(entry.resolved_via)}</td>
								<td class="col-actions">
									<button class="btn-detail" onclick={() => viewDetail(entry)}> Detail </button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="pagination">
					<button disabled={currentPage <= 1} onclick={() => (currentPage = currentPage - 1)}>
						Previous
					</button>
					<span>Page {currentPage} of {totalPages}</span>
					<button
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = currentPage + 1)}
					>
						Next
					</button>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Top Denied (side panel) -->
	{#if stats && stats.top_denied_permissions.length > 0}
		<section class="top-denied-section">
			<h3>Top Denied Permissions</h3>
			<ul class="top-list">
				{#each stats.top_denied_permissions.slice(0, 5) as item (item.permission)}
					<li>
						<code>{item.permission}</code>
						<span class="count">{item.count}</span>
					</li>
				{/each}
			</ul>

			{#if stats.top_denied_subjects.length > 0}
				<h3>Top Denied Subjects</h3>
				<ul class="top-list">
					{#each stats.top_denied_subjects.slice(0, 5) as item (item.subject_id)}
						<li>
							<code>{item.subject_id}</code>
							<span class="count">{item.count}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<!-- Detail Dialog -->
{#if showDetailDialog && selectedEntry}
	<div class="dialog-overlay" onclick={closeDetail} role="presentation">
		<div class="dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<header class="dialog-header">
				<h2>Access Decision Detail</h2>
				<button class="btn-close" onclick={closeDetail}>&times;</button>
			</header>

			<div class="dialog-body">
				<div class="detail-grid">
					<div class="detail-row">
						<span class="detail-label">ID</span>
						<span class="detail-value"><code>{selectedEntry.id}</code></span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Time</span>
						<span class="detail-value">{formatTimestamp(selectedEntry.checked_at)}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Subject ID</span>
						<span class="detail-value"><code>{selectedEntry.subject_id}</code></span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Permission</span>
						<span class="detail-value"
							><code
								>{formatPermission(selectedEntry.permission, selectedEntry.permission_parsed)}</code
							></span
						>
					</div>
					<div class="detail-row">
						<span class="detail-label">Decision</span>
						<span class="detail-value">
							<span class="badge badge-{getDecisionColor(selectedEntry.allowed)}">
								{getDecisionLabel(selectedEntry.allowed)}
							</span>
						</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Final Decision</span>
						<span class="detail-value">{selectedEntry.final_decision}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Resolved Via</span>
						<span class="detail-value">{formatResolvedVia(selectedEntry.resolved_via)}</span>
					</div>
					{#if selectedEntry.reason}
						<div class="detail-row">
							<span class="detail-label">Reason</span>
							<span class="detail-value reason">{selectedEntry.reason}</span>
						</div>
					{/if}
					{#if selectedEntry.api_key_id}
						<div class="detail-row">
							<span class="detail-label">API Key ID</span>
							<span class="detail-value"><code>{selectedEntry.api_key_id}</code></span>
						</div>
					{/if}
					{#if selectedEntry.client_id}
						<div class="detail-row">
							<span class="detail-label">Client ID</span>
							<span class="detail-value"><code>{selectedEntry.client_id}</code></span>
						</div>
					{/if}
				</div>

				{#if selectedEntry.permission_parsed}
					<div class="parsed-permission">
						<h4>Parsed Permission</h4>
						<pre>{JSON.stringify(selectedEntry.permission_parsed, null, 2)}</pre>
					</div>
				{/if}
			</div>

			<footer class="dialog-footer">
				<button class="btn-secondary" onclick={closeDetail}>Close</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.page-container {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--color-text-secondary, #6b7280);
		margin: 0;
	}

	.error-banner {
		background: var(--color-error-bg, #fef2f2);
		color: var(--color-error, #dc2626);
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	/* Stats Section */
	.stats-section {
		margin-bottom: 1.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: var(--color-bg-secondary, #f9fafb);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}

	.stat-card.success {
		border-left: 4px solid var(--color-success, #22c55e);
	}

	.stat-card.danger {
		border-left: 4px solid var(--color-error, #ef4444);
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0.25rem 0;
	}

	.stat-period,
	.stat-rate {
		font-size: 0.75rem;
		color: var(--color-text-tertiary, #9ca3af);
	}

	/* Timeline Section */
	.timeline-section {
		margin-bottom: 1.5rem;
	}

	.timeline-section h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.timeline-chart {
		display: flex;
		align-items: flex-end;
		height: 100px;
		gap: 2px;
		background: var(--color-bg-secondary, #f9fafb);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		padding: 0.5rem;
	}

	.timeline-bar-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 4px;
	}

	.timeline-bar {
		width: 100%;
		border-radius: 1px;
		transition: height 0.2s ease;
	}

	.timeline-bar.allowed {
		background: var(--color-success, #22c55e);
	}

	.timeline-bar.denied {
		background: var(--color-error, #ef4444);
	}

	.timeline-legend {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.legend-item::before {
		content: '';
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.legend-item.allowed::before {
		background: var(--color-success, #22c55e);
	}

	.legend-item.denied::before {
		background: var(--color-error, #ef4444);
	}

	/* Filters Section */
	.filters-section {
		margin-bottom: 1.5rem;
	}

	.period-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.period-tab {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		background: var(--color-bg, #fff);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.period-tab:hover {
		background: var(--color-bg-secondary, #f9fafb);
	}

	.period-tab.active {
		background: var(--color-primary, #3b82f6);
		color: white;
		border-color: var(--color-primary, #3b82f6);
	}

	.filter-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filter-group label {
		font-size: 0.75rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.filter-group input,
	.filter-group select {
		padding: 0.5rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		min-width: 150px;
	}

	.btn-search {
		padding: 0.5rem 1rem;
		background: var(--color-primary, #3b82f6);
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.btn-search:hover {
		background: var(--color-primary-dark, #2563eb);
	}

	/* Entries Section */
	.entries-section {
		margin-bottom: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.entry-count {
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.loading-state,
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-secondary, #6b7280);
		background: var(--color-bg-secondary, #f9fafb);
		border-radius: 0.5rem;
	}

	.table-container {
		overflow-x: auto;
	}

	.entries-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.entries-table th {
		text-align: left;
		padding: 0.75rem;
		background: var(--color-bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
		font-weight: 500;
	}

	.entries-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.entries-table tr:hover {
		background: var(--color-bg-secondary, #f9fafb);
	}

	.entries-table tr.denied {
		background: var(--color-error-bg, #fef2f2);
	}

	.col-time {
		white-space: nowrap;
	}

	.col-subject code,
	.col-permission code {
		font-size: 0.75rem;
		background: var(--color-bg-secondary, #f3f4f6);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.badge-success {
		background: var(--color-success-bg, #dcfce7);
		color: var(--color-success, #22c55e);
	}

	.badge-danger {
		background: var(--color-error-bg, #fef2f2);
		color: var(--color-error, #ef4444);
	}

	.btn-detail {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background: var(--color-bg, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.btn-detail:hover {
		background: var(--color-bg-secondary, #f9fafb);
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.pagination button {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		background: var(--color-bg, #fff);
		cursor: pointer;
	}

	.pagination button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Top Denied Section */
	.top-denied-section {
		background: var(--color-bg-secondary, #f9fafb);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.top-denied-section h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
	}

	.top-denied-section h3:not(:first-child) {
		margin-top: 1rem;
	}

	.top-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.top-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.top-list li:last-child {
		border-bottom: none;
	}

	.top-list code {
		font-size: 0.75rem;
		background: var(--color-bg, #fff);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.top-list .count {
		font-size: 0.75rem;
		color: var(--color-error, #ef4444);
		font-weight: 500;
	}

	/* Dialog */
	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.dialog {
		background: var(--color-bg, #fff);
		border-radius: 0.5rem;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		overflow: auto;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.dialog-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-text-secondary, #6b7280);
	}

	.dialog-body {
		padding: 1rem;
	}

	.detail-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-row {
		display: flex;
		gap: 1rem;
	}

	.detail-label {
		flex: 0 0 120px;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.detail-value {
		flex: 1;
		font-size: 0.875rem;
	}

	.detail-value code {
		font-size: 0.75rem;
		background: var(--color-bg-secondary, #f3f4f6);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		word-break: break-all;
	}

	.detail-value.reason {
		color: var(--color-error, #ef4444);
	}

	.parsed-permission {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	.parsed-permission h4 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
	}

	.parsed-permission pre {
		background: var(--color-bg-secondary, #f3f4f6);
		padding: 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		overflow-x: auto;
	}

	.dialog-footer {
		padding: 1rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
		display: flex;
		justify-content: flex-end;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: var(--color-bg-secondary, #f3f4f6);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: var(--color-border, #e5e7eb);
	}
</style>
