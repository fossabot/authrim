<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminComplianceAPI,
		getFrameworkDisplayName,
		type ComplianceStatus,
		type ComplianceFramework,
		type ComplianceCheckStatus,
		type AccessReview,
		type ComplianceReport,
		type DataRetentionStatus,
		type AccessReviewScope
	} from '$lib/api/admin-compliance';
	import {
		adminDataRetentionAPI,
		getCategoryDisplayName,
		getCategoryDescription
	} from '$lib/api/admin-data-retention';
	import RetentionPolicyEditDialog from '$lib/components/RetentionPolicyEditDialog.svelte';
	import { Modal } from '$lib/components';
	import { formatDate, isValidDownloadUrl, SMALL_PAGE_SIZE, sanitizeText } from '$lib/utils';

	// State
	let loading = $state(true);
	let error = $state('');
	let complianceStatus = $state<ComplianceStatus | null>(null);
	let accessReviews = $state<AccessReview[]>([]);
	let reports = $state<ComplianceReport[]>([]);
	let dataRetention = $state<DataRetentionStatus | null>(null);

	// Tabs
	let activeTab = $state<'overview' | 'reviews' | 'reports' | 'retention'>('overview');

	// Tab definitions
	const TABS = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'reviews', label: 'Access Reviews' },
		{ id: 'reports', label: 'Reports' },
		{ id: 'retention', label: 'Data Retention' }
	] as const;

	// Start Review Dialog
	let showStartReviewDialog = $state(false);
	let startingReview = $state(false);
	let startReviewError = $state('');
	let newReviewName = $state('');
	let newReviewScope = $state<AccessReviewScope>('all_users');
	let newReviewDueDate = $state('');

	// Retention Edit Dialog
	let showRetentionEditDialog = $state(false);
	let editingCategory = $state<string | null>(null);
	let editingRetentionDays = $state(0);
	let retentionActionError = $state('');

	// Cleanup Confirmation Dialog
	let showCleanupDialog = $state(false);
	let cleanupLoading = $state(false);
	let cleanupResult = $state<{ deleted: number; runId: string } | null>(null);

	// Framework Detail Modal
	interface FrameworkCheckDetail {
		id: string;
		name: string;
		description: string;
		status: 'implemented' | 'planned';
	}

	interface FrameworkDetail {
		fullName: string;
		description: string;
		checks: FrameworkCheckDetail[];
		inScope: string[];
		outOfScope: { item: string; reason: string }[];
	}

	const FRAMEWORK_DETAILS: Partial<Record<ComplianceFramework, FrameworkDetail>> = {
		GDPR: {
			fullName: 'General Data Protection Regulation',
			description:
				'EU regulation on data protection and privacy for individuals within the European Union and European Economic Area. Authrim evaluates authentication-service-level GDPR controls.',
			checks: [
				{
					id: 'data_retention_policy',
					name: 'Data Retention Policy',
					description: 'Data retention policy enabled with automated cleanup',
					status: 'implemented'
				},
				{
					id: 'right_to_erasure',
					name: 'Right to Erasure',
					description: 'User deletion with PII tombstone for proof of deletion',
					status: 'implemented'
				},
				{
					id: 'data_encryption',
					name: 'Data Encryption',
					description: 'Full encryption at rest (D1/R2) and in transit (HTTPS/TLS)',
					status: 'implemented'
				},
				{
					id: 'consent_management',
					name: 'Consent Management',
					description: 'User consent acquisition, recording, and withdrawal',
					status: 'planned'
				},
				{
					id: 'dsar_support',
					name: 'Data Subject Access Request (DSAR)',
					description: 'User data export capability',
					status: 'planned'
				},
				{
					id: 'data_minimization',
					name: 'Data Minimization',
					description: 'Collection of only the minimum necessary data',
					status: 'planned'
				},
				{
					id: 'pii_access_audit',
					name: 'Audit Trail of PII Access',
					description: 'Access logging for personally identifiable information',
					status: 'planned'
				},
				{
					id: 'breached_password_detection',
					name: 'Breached Password Detection',
					description: 'Detection of compromised passwords',
					status: 'planned'
				}
			],
			inScope: [
				'Data retention policy enforcement',
				'User data deletion with proof of erasure (tombstone)',
				'Encryption at rest and in transit',
				'Authentication data protection',
				'Consent recording for authentication flows'
			],
			outOfScope: [
				{
					item: 'Data Processing Agreements (DPA)',
					reason: 'Legal document, tenant responsibility'
				},
				{ item: 'Cookie consent banners', reason: 'Application layer responsibility' },
				{ item: 'Data portability (non-auth data)', reason: 'Application side responsibility' },
				{
					item: 'DPIA (Data Protection Impact Assessment)',
					reason: 'Organizational process'
				},
				{
					item: 'Breach notification to authority',
					reason: '72-hour obligation, organizational process'
				},
				{ item: 'Lawful basis for processing', reason: 'Tenant business decision' },
				{ item: 'DPO appointment', reason: 'Organizational requirement' },
				{
					item: 'International data transfer (SCCs)',
					reason: 'Legal/organizational requirement'
				}
			]
		},
		SOC2: {
			fullName: 'Service Organization Control 2',
			description:
				'Audit framework for service organizations, evaluating controls relevant to security, availability, processing integrity, confidentiality, and privacy.',
			checks: [
				{
					id: 'audit_logging',
					name: 'Audit Logging',
					description: 'Audit log recording and retention',
					status: 'implemented'
				},
				{
					id: 'rbac',
					name: 'Role-Based Access Control',
					description: 'RBAC configuration and enforcement',
					status: 'implemented'
				},
				{
					id: 'mfa_coverage',
					name: 'MFA Coverage',
					description: 'Multi-factor authentication adoption rate',
					status: 'implemented'
				},
				{
					id: 'encryption',
					name: 'Encryption',
					description: 'Encryption at rest and in transit',
					status: 'implemented'
				},
				{
					id: 'key_rotation',
					name: 'Key Rotation',
					description: 'Signing key rotation status',
					status: 'planned'
				},
				{
					id: 'session_management',
					name: 'Session Management',
					description: 'Session timeout and concurrent session limits',
					status: 'planned'
				},
				{
					id: 'password_policy',
					name: 'Password Policy',
					description: 'Password complexity and expiration requirements',
					status: 'planned'
				},
				{
					id: 'rate_limiting',
					name: 'Rate Limiting',
					description: 'Brute-force attack protection',
					status: 'planned'
				},
				{
					id: 'account_lockout',
					name: 'Account Lockout',
					description: 'Failed login attempt restrictions',
					status: 'planned'
				},
				{
					id: 'access_review',
					name: 'Access Review',
					description: 'Periodic access review completion status',
					status: 'planned'
				}
			],
			inScope: [
				'Audit log recording and retention',
				'Role-based access control enforcement',
				'Multi-factor authentication coverage',
				'Data encryption at rest and in transit',
				'Authentication and session security'
			],
			outOfScope: [
				{ item: 'SOC2 Type II formal audit', reason: 'Requires external CPA audit' },
				{
					item: 'Physical security controls',
					reason: 'Cloudflare infrastructure responsibility'
				},
				{ item: 'Network security monitoring', reason: 'Cloudflare responsibility' },
				{ item: 'Employee background checks', reason: 'Organizational process' },
				{ item: 'Vendor risk management', reason: 'Organizational process' },
				{
					item: 'Business continuity / DR',
					reason: 'Infrastructure layer (Cloudflare Workers/D1)'
				},
				{ item: 'Change management procedures', reason: 'Development process' }
			]
		}
	};

	let selectedFramework = $state<ComplianceFramework | null>(null);

	let selectedFrameworkDetail = $derived(
		selectedFramework ? (FRAMEWORK_DETAILS[selectedFramework] ?? null) : null
	);

	let selectedFrameworkChecks = $derived(
		selectedFramework ? getFrameworkChecksWithStatus(selectedFramework) : []
	);

	let selectedFrameworkStatus = $derived(
		selectedFramework && complianceStatus
			? (complianceStatus.frameworks.find((f) => f.framework === selectedFramework) ?? null)
			: null
	);

	let implementedChecks = $derived(
		selectedFrameworkChecks.filter((c) => c.status === 'implemented')
	);

	let plannedChecks = $derived(selectedFrameworkChecks.filter((c) => c.status === 'planned'));

	// Helper functions for CSS classes
	function getComplianceStatusClass(status: string): string {
		switch (status) {
			case 'compliant':
				return 'compliance-status-badge compliant';
			case 'partial':
				return 'compliance-status-badge partial';
			case 'non_compliant':
				return 'compliance-status-badge non-compliant';
			default:
				return 'compliance-status-badge';
		}
	}

	function getComplianceStatusLabel(status: string): string {
		switch (status) {
			case 'compliant':
				return 'Compliant';
			case 'partial':
				return 'Partial';
			case 'non_compliant':
				return 'Non-Compliant';
			default:
				return status;
		}
	}

	function getComplianceProgressClass(status: string): string {
		switch (status) {
			case 'compliant':
				return 'progress-fill compliant';
			case 'partial':
				return 'progress-fill partial';
			case 'non_compliant':
				return 'progress-fill non-compliant';
			default:
				return 'progress-fill';
		}
	}

	function getReviewStatusClass(status: string): string {
		switch (status) {
			case 'pending':
				return 'review-status-badge pending';
			case 'in_progress':
				return 'review-status-badge in-progress';
			case 'completed':
				return 'review-status-badge completed';
			case 'cancelled':
				return 'review-status-badge cancelled';
			default:
				return 'review-status-badge';
		}
	}

	function getReportStatusClass(status: string): string {
		switch (status) {
			case 'pending':
				return 'report-status-badge pending';
			case 'generating':
				return 'report-status-badge generating';
			case 'completed':
				return 'report-status-badge completed';
			case 'failed':
				return 'report-status-badge failed';
			default:
				return 'report-status-badge';
		}
	}

	function getStatusValueClass(enabled: boolean): string {
		return enabled ? 'quick-stat-value enabled' : 'quick-stat-value disabled';
	}

	async function loadData() {
		loading = true;
		error = '';

		const results = await Promise.allSettled([
			adminComplianceAPI.getStatus(),
			adminComplianceAPI.listAccessReviews({ limit: SMALL_PAGE_SIZE }),
			adminComplianceAPI.listReports({ limit: SMALL_PAGE_SIZE }),
			adminComplianceAPI.getDataRetentionStatus()
		]);

		// Collect all errors and update successful results
		const errors: string[] = [];
		const names = ['Status', 'Access Reviews', 'Reports', 'Data Retention'];

		if (results[0].status === 'fulfilled') {
			complianceStatus = results[0].value;
		} else {
			errors.push(
				`${names[0]}: ${results[0].reason instanceof Error ? results[0].reason.message : 'Failed to load'}`
			);
		}

		if (results[1].status === 'fulfilled') {
			// Defensive check: ensure data is an array
			// Apply sanitization to prevent XSS
			accessReviews = Array.isArray(results[1].value.data)
				? results[1].value.data.map(sanitizeReview)
				: [];
		} else {
			errors.push(
				`${names[1]}: ${results[1].reason instanceof Error ? results[1].reason.message : 'Failed to load'}`
			);
		}

		if (results[2].status === 'fulfilled') {
			// Defensive check: ensure data is an array
			reports = Array.isArray(results[2].value.data) ? results[2].value.data : [];
		} else {
			errors.push(
				`${names[2]}: ${results[2].reason instanceof Error ? results[2].reason.message : 'Failed to load'}`
			);
		}

		if (results[3].status === 'fulfilled') {
			dataRetention = results[3].value;
		} else {
			errors.push(
				`${names[3]}: ${results[3].reason instanceof Error ? results[3].reason.message : 'Failed to load'}`
			);
		}

		if (errors.length > 0) {
			error = errors.length === 1 ? errors[0] : `Multiple errors: ${errors.join('; ')}`;
		}

		loading = false;
	}

	onMount(() => {
		loadData();
	});

	function openStartReviewDialog() {
		newReviewName = '';
		newReviewScope = 'all_users';
		newReviewDueDate = '';
		startReviewError = '';
		showStartReviewDialog = true;
	}

	function closeStartReviewDialog() {
		showStartReviewDialog = false;
	}

	const MAX_REVIEW_NAME_LENGTH = 100;

	async function handleStartReview() {
		const trimmedName = newReviewName.trim();

		if (!trimmedName) {
			startReviewError = 'Review name is required';
			return;
		}

		if (trimmedName.length > MAX_REVIEW_NAME_LENGTH) {
			startReviewError = `Review name must be ${MAX_REVIEW_NAME_LENGTH} characters or less`;
			return;
		}

		startingReview = true;
		startReviewError = '';

		try {
			const review = await adminComplianceAPI.startAccessReview({
				name: newReviewName.trim(),
				scope: newReviewScope,
				due_date: newReviewDueDate || undefined
			});
			// Apply sanitization to prevent XSS
			accessReviews = [sanitizeReview(review), ...accessReviews];
			closeStartReviewDialog();
		} catch (e) {
			startReviewError = e instanceof Error ? e.message : 'Failed to start review';
		} finally {
			startingReview = false;
		}
	}

	/**
	 * Sanitize and format scope value for display
	 * Only allows known scope values to prevent XSS
	 */
	function formatScopeDisplay(scope: string): string {
		const validScopes: Record<string, string> = {
			all_users: 'All Users',
			role: 'Role',
			organization: 'Organization',
			inactive_users: 'Inactive Users'
		};
		return validScopes[scope] || 'Unknown';
	}

	/**
	 * Sanitize and format report type for display
	 * Only allows known report types to prevent XSS
	 * Must match API's ReportType definition
	 */
	function formatReportTypeDisplay(type: string): string {
		const validTypes: Record<string, string> = {
			gdpr_dsar: 'GDPR DSAR',
			soc2_audit: 'SOC2 AUDIT',
			access_summary: 'ACCESS SUMMARY',
			user_activity: 'USER ACTIVITY'
		};
		return validTypes[type] || 'UNKNOWN';
	}

	// Global Escape key handler for dialogs
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (selectedFramework) {
				closeFrameworkDetail();
			} else if (showStartReviewDialog) {
				closeStartReviewDialog();
			}
		}
	}

	// Sanitize API response fields to prevent XSS (defense in depth)
	function sanitizeReview(review: AccessReview): AccessReview {
		return {
			...review,
			name: sanitizeText(review.name)
		};
	}

	// Framework Detail functions
	function openFrameworkDetail(frameworkKey: ComplianceFramework) {
		selectedFramework = frameworkKey;
	}

	function closeFrameworkDetail() {
		selectedFramework = null;
	}

	function getFrameworkChecksWithStatus(frameworkKey: ComplianceFramework): Array<
		FrameworkCheckDetail & {
			liveStatus?: ComplianceCheckStatus;
			liveDetails?: string;
			checkedAt?: string;
		}
	> {
		const detail = FRAMEWORK_DETAILS[frameworkKey];
		if (!detail || !complianceStatus) return [];

		const recentChecks = complianceStatus.recent_checks.filter((c) => c.framework === frameworkKey);

		return detail.checks.map((check) => {
			const liveCheck = recentChecks.find((rc) => rc.id === check.id);
			return {
				...check,
				liveStatus: liveCheck?.status,
				liveDetails: liveCheck?.details,
				checkedAt: liveCheck?.checked_at
			};
		});
	}

	// Retention Edit functions
	function openRetentionEditDialog(category: string, currentDays: number) {
		editingCategory = category;
		editingRetentionDays = currentDays;
		retentionActionError = '';
		showRetentionEditDialog = true;
	}

	function closeRetentionEditDialog() {
		showRetentionEditDialog = false;
		editingCategory = null;
	}

	async function handleRetentionSave(category: string, retentionDays: number) {
		await adminDataRetentionAPI.updateCategory(category, retentionDays);
		// Reload data to show updated values
		const freshData = await adminComplianceAPI.getDataRetentionStatus();
		dataRetention = freshData;
		closeRetentionEditDialog();
	}

	// Cleanup functions
	function openCleanupDialog() {
		cleanupResult = null;
		retentionActionError = '';
		showCleanupDialog = true;
	}

	function closeCleanupDialog() {
		showCleanupDialog = false;
		cleanupResult = null;
	}

	async function executeCleanup() {
		cleanupLoading = true;
		retentionActionError = '';

		try {
			const result = await adminDataRetentionAPI.runCleanup();
			cleanupResult = {
				deleted: result.deleted_count || 0,
				runId: result.run_id
			};
			// Reload data to show updated values
			const freshData = await adminComplianceAPI.getDataRetentionStatus();
			dataRetention = freshData;
		} catch (err) {
			retentionActionError = err instanceof Error ? err.message : 'Failed to execute cleanup';
		} finally {
			cleanupLoading = false;
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="admin-page">
	<div class="page-header">
		<div class="page-header-info">
			<h1 class="page-title">Compliance</h1>
			<p class="modal-description">
				Monitor compliance status across multiple frameworks, manage access reviews, view compliance
				reports, and track data retention policies.
			</p>
		</div>
	</div>

	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	<!-- Tabs -->
	<div class="security-tabs" role="tablist">
		{#each TABS as tab (tab.id)}
			<button
				onclick={() => {
					error = '';
					activeTab = tab.id;
				}}
				role="tab"
				aria-selected={activeTab === tab.id}
				class="security-tab"
				class:active={activeTab === tab.id}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="loading-state">Loading compliance data...</div>
	{:else if activeTab === 'overview' && complianceStatus}
		<!-- Overview Tab -->
		<div class="compliance-overview">
			<!-- Overall Status -->
			<div class="panel">
				<div class="compliance-overall-header">
					<div>
						<h2 class="section-title">Overall Compliance Status</h2>
						<p class="text-muted">Assessment across all compliance frameworks</p>
					</div>
					<div class={getComplianceStatusClass(complianceStatus.overall_status)}>
						{getComplianceStatusLabel(complianceStatus.overall_status)}
					</div>
				</div>
			</div>

			<!-- Frameworks Grid -->
			<div class="framework-grid">
				{#each complianceStatus.frameworks as framework (framework.framework)}
					{@const hasDetail = !!FRAMEWORK_DETAILS[framework.framework]}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div
						class="framework-card"
						class:framework-card-clickable={hasDetail}
						onclick={() => hasDetail && openFrameworkDetail(framework.framework)}
						onkeydown={(e) =>
							e.key === 'Enter' && hasDetail && openFrameworkDetail(framework.framework)}
						role={hasDetail ? 'button' : undefined}
						tabindex={hasDetail ? 0 : undefined}
					>
						<div class="framework-card-header">
							<h3 class="framework-name">{getFrameworkDisplayName(framework.framework)}</h3>
							<span class={getComplianceStatusClass(framework.status)}>
								{getComplianceStatusLabel(framework.status)}
							</span>
						</div>
						<div class="framework-progress">
							<div class="framework-progress-info">
								<span>Compliance Progress</span>
								<span>{framework.compliant_checks}/{framework.total_checks} checks</span>
							</div>
							<div class="progress-bar">
								<div
									class={getComplianceProgressClass(framework.status)}
									style="width: {framework.total_checks > 0
										? (framework.compliant_checks / framework.total_checks) * 100
										: 0}%"
								></div>
							</div>
						</div>
						{#if framework.issues.length > 0}
							<div class="framework-issues">
								⚠️ {framework.issues.length} issue{framework.issues.length > 1 ? 's' : ''} found
							</div>
						{/if}
						<div class="framework-last-checked">
							Last checked: {formatDate(framework.last_checked)}
						</div>
					</div>
				{/each}
			</div>

			<!-- Quick Stats -->
			<div class="quick-stats-grid">
				<div class="quick-stat-card">
					<div class="quick-stat-label">Data Retention</div>
					<div class={getStatusValueClass(complianceStatus.data_retention?.enabled ?? false)}>
						{complianceStatus.data_retention?.enabled ? 'Enabled' : 'Disabled'}
					</div>
				</div>
				<div class="quick-stat-card">
					<div class="quick-stat-label">Audit Log</div>
					<div class={getStatusValueClass(complianceStatus.audit_log?.enabled ?? false)}>
						{complianceStatus.audit_log?.retention_days ?? '-'} days
					</div>
				</div>
				<div class="quick-stat-card">
					<div class="quick-stat-label">MFA Coverage</div>
					<div class="quick-stat-value primary">
						{complianceStatus.mfa_enforcement?.coverage_percent ?? 0}%
					</div>
				</div>
				<div class="quick-stat-card">
					<div class="quick-stat-label">Encryption</div>
					<div
						class="quick-stat-value {complianceStatus.encryption?.at_rest &&
						complianceStatus.encryption?.in_transit
							? 'enabled'
							: 'partial'}"
					>
						{complianceStatus.encryption?.at_rest && complianceStatus.encryption?.in_transit
							? 'Full'
							: 'Partial'}
					</div>
				</div>
			</div>
		</div>
	{:else if activeTab === 'reviews'}
		<!-- Access Reviews Tab -->
		<div>
			<div class="tab-header-actions">
				<button class="btn btn-primary" onclick={openStartReviewDialog}> Start New Review </button>
			</div>

			{#if accessReviews.length === 0}
				<div class="empty-state">
					<p>No access reviews found.</p>
				</div>
			{:else}
				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Scope</th>
								<th>Progress</th>
								<th>Status</th>
								<th>Started</th>
							</tr>
						</thead>
						<tbody>
							{#each accessReviews as review (review.id)}
								<tr>
									<td>
										<div class="cell-primary">{review.name}</div>
									</td>
									<td>{formatScopeDisplay(review.scope)}</td>
									<td>
										<div class="review-progress-cell">
											<div class="progress-bar review-progress">
												<div
													class="progress-fill primary"
													style="width: {review.total_users > 0
														? (review.reviewed_users / review.total_users) * 100
														: 0}%"
												></div>
											</div>
											<span class="review-progress-text">
												{review.reviewed_users}/{review.total_users}
											</span>
										</div>
									</td>
									<td>
										<span class={getReviewStatusClass(review.status)}>
											{review.status}
										</span>
									</td>
									<td class="text-muted">{formatDate(review.started_at)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else if activeTab === 'reports'}
		<!-- Reports Tab -->
		<div>
			{#if reports.length === 0}
				<div class="empty-state">
					<p>No compliance reports found.</p>
				</div>
			{:else}
				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>Type</th>
								<th>Status</th>
								<th>Requested</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each reports as report (report.id)}
								<tr>
									<td>
										<div class="cell-primary">{formatReportTypeDisplay(report.type)}</div>
									</td>
									<td>
										<span class={getReportStatusClass(report.status)}>
											{report.status}
										</span>
									</td>
									<td class="text-muted">{formatDate(report.requested_at)}</td>
									<td>
										{#if report.status === 'completed' && report.download_url && isValidDownloadUrl(report.download_url)}
											<a
												href={report.download_url}
												target="_blank"
												rel="noopener noreferrer"
												class="link-primary"
											>
												Download
											</a>
										{:else}
											<span class="text-muted">-</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else if activeTab === 'retention' && dataRetention}
		<!-- Data Retention Tab -->
		<div class="retention-overview">
			<!-- Status Card -->
			<div class="panel">
				<h2 class="section-title">Data Retention Policy</h2>
				<div class="retention-stats-grid">
					<div class="retention-stat">
						<div class="retention-stat-label">Status</div>
						<div class={getStatusValueClass(dataRetention.enabled)}>
							{dataRetention.enabled ? 'Enabled' : 'Disabled'}
						</div>
					</div>
					<div class="retention-stat">
						<div class="retention-stat-label">GDPR Compliant</div>
						<div class={getStatusValueClass(dataRetention.gdpr_compliant)}>
							{dataRetention.gdpr_compliant ? 'Yes' : 'No'}
						</div>
					</div>
					<div class="retention-stat">
						<div class="retention-stat-label">Last Cleanup</div>
						<div class="retention-stat-value">
							{dataRetention.last_cleanup ? formatDate(dataRetention.last_cleanup) : '-'}
						</div>
					</div>
					<div class="retention-stat">
						<div class="retention-stat-label">Next Cleanup</div>
						<div class="retention-stat-value">
							{dataRetention.next_scheduled_cleanup
								? formatDate(dataRetention.next_scheduled_cleanup)
								: '-'}
						</div>
					</div>
				</div>
			</div>

			<!-- Categories -->
			{#if dataRetention.categories.length > 0}
				<div class="panel retention-categories-panel">
					<div class="retention-categories-header">
						<div>
							<h3 class="section-title">Retention Categories</h3>
							<p class="text-muted">
								Configure how long data is retained before automatic deletion
							</p>
						</div>
						<button class="btn btn-warning" onclick={openCleanupDialog}>
							<span>🗑️</span>
							Run Cleanup
						</button>
					</div>
					<div class="table-container">
						<table class="data-table">
							<thead>
								<tr>
									<th>Category</th>
									<th class="text-center">Retention</th>
									<th class="text-right">Records</th>
									<th>Oldest Record</th>
									<th>Next Cleanup</th>
									<th class="text-center">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each dataRetention.categories as category (category.category)}
									<tr>
										<td>
											<div class="cell-primary">{getCategoryDisplayName(category.category)}</div>
											<div class="cell-secondary">{getCategoryDescription(category.category)}</div>
										</td>
										<td class="text-center">
											<span class="retention-days-badge">{category.retention_days} days</span>
										</td>
										<td class="text-right">{category.records_count.toLocaleString()}</td>
										<td class="text-muted">
											{category.oldest_record ? formatDate(category.oldest_record) : '-'}
										</td>
										<td class="text-muted">
											{category.next_cleanup ? formatDate(category.next_cleanup) : '-'}
										</td>
										<td class="text-center">
											<button
												class="btn btn-ghost btn-sm"
												onclick={() =>
													openRetentionEditDialog(category.category, category.retention_days)}
											>
												Edit
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Information Notice -->
				<div class="info-box">
					<span class="info-box-icon">ℹ️</span>
					<div>
						<div class="info-box-title">About Data Retention</div>
						<p class="info-box-text">
							Data retention policies help maintain GDPR compliance by automatically removing old
							data. Tombstones (deletion records) are kept longer to provide proof of deletion for
							regulatory purposes. Contact your administrator to modify retention periods.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Start Review Dialog -->
<Modal
	open={showStartReviewDialog}
	onClose={closeStartReviewDialog}
	title="Start Access Review"
	size="md"
>
	{#if startReviewError}
		<div class="alert alert-error">{startReviewError}</div>
	{/if}

	<div class="form-group">
		<label for="review-name" class="form-label">Review Name</label>
		<input
			type="text"
			id="review-name"
			class="form-input"
			bind:value={newReviewName}
			placeholder="e.g., Q1 2026 Access Review"
		/>
	</div>

	<div class="form-group">
		<label for="review-scope" class="form-label">Scope</label>
		<select id="review-scope" class="form-select" bind:value={newReviewScope}>
			<option value="all_users">All Users</option>
			<option value="role">By Role</option>
			<option value="organization">By Organization</option>
			<option value="inactive_users">Inactive Users</option>
		</select>
	</div>

	<div class="form-group">
		<label for="review-due-date" class="form-label">Due Date (optional)</label>
		<input type="date" id="review-due-date" class="form-input" bind:value={newReviewDueDate} />
	</div>

	{#snippet footer()}
		<button class="btn btn-secondary" onclick={closeStartReviewDialog} disabled={startingReview}>
			Cancel
		</button>
		<button class="btn btn-primary" onclick={handleStartReview} disabled={startingReview}>
			{startingReview ? 'Starting...' : 'Start Review'}
		</button>
	{/snippet}
</Modal>

<!-- Retention Policy Edit Dialog -->
<RetentionPolicyEditDialog
	open={showRetentionEditDialog}
	category={editingCategory}
	currentRetentionDays={editingRetentionDays}
	onClose={closeRetentionEditDialog}
	onSave={handleRetentionSave}
/>

<!-- Cleanup Confirmation Dialog -->
<Modal
	open={showCleanupDialog}
	onClose={closeCleanupDialog}
	title={cleanupResult ? 'Cleanup Completed' : 'Run Data Cleanup'}
	size="md"
>
	{#if cleanupResult}
		<!-- Success State -->
		<div class="cleanup-success">
			<div class="cleanup-success-icon">✅</div>
			<p class="text-muted">
				Successfully deleted <strong>{cleanupResult.deleted.toLocaleString()}</strong> records.
			</p>
			<p class="cleanup-run-id">Run ID: {cleanupResult.runId}</p>
		</div>
	{:else}
		<!-- Confirmation State -->
		{#if retentionActionError}
			<div class="alert alert-error">{retentionActionError}</div>
		{/if}

		<div class="warning-box">
			<span class="warning-box-icon">⚠️</span>
			<div>
				<div class="warning-box-title">Warning: This action cannot be undone</div>
				<p class="warning-box-text">
					This will permanently delete all data that exceeds the configured retention periods across
					all categories. Records older than their category's retention period will be removed.
				</p>
			</div>
		</div>

		<p class="text-muted cleanup-confirm-text">
			Are you sure you want to run the data cleanup now? This process will delete expired records
			based on each category's retention policy.
		</p>
	{/if}

	{#snippet footer()}
		{#if cleanupResult}
			<button class="btn btn-primary" onclick={closeCleanupDialog}>Close</button>
		{:else}
			<button class="btn btn-secondary" onclick={closeCleanupDialog} disabled={cleanupLoading}>
				Cancel
			</button>
			<button class="btn btn-danger" onclick={executeCleanup} disabled={cleanupLoading}>
				{cleanupLoading ? 'Deleting...' : 'Delete Expired Data'}
			</button>
		{/if}
	{/snippet}
</Modal>

<!-- Framework Detail Modal -->
<Modal
	open={!!selectedFramework && !!selectedFrameworkDetail}
	onClose={closeFrameworkDetail}
	title={selectedFramework ? getFrameworkDisplayName(selectedFramework) : ''}
	size="lg"
>
	{#snippet header()}
		<div>
			<h2 class="modal-title">
				{selectedFramework ? getFrameworkDisplayName(selectedFramework) : ''}
			</h2>
			<p class="fw-detail-fullname">{selectedFrameworkDetail?.fullName ?? ''}</p>
		</div>
		{#if selectedFrameworkStatus}
			<span class={getComplianceStatusClass(selectedFrameworkStatus.status)}>
				{getComplianceStatusLabel(selectedFrameworkStatus.status)}
			</span>
		{/if}
	{/snippet}

	<div class="fw-detail-body">
		<p class="fw-detail-description">{selectedFrameworkDetail?.description ?? ''}</p>

		<!-- Compliance Checks (Implemented) -->
		{#if implementedChecks.length > 0}
			<div class="fw-detail-section">
				<h3 class="fw-detail-section-title">Compliance Checks</h3>
				<div class="fw-check-list">
					{#each implementedChecks as check (check.id)}
						<div class="fw-check-item">
							<div class="fw-check-info">
								<span
									class="fw-check-icon {check.liveStatus
										? 'check-' + check.liveStatus
										: 'check-implemented'}"
								>
									{#if check.liveStatus === 'partial'}⚠{:else if check.liveStatus === 'non_compliant'}✗{:else}✓{/if}
								</span>
								<div>
									<div class="fw-check-name">{check.name}</div>
									<div class="fw-check-desc">
										{check.liveDetails || check.description}
									</div>
								</div>
							</div>
							{#if check.liveStatus}
								<span class={getComplianceStatusClass(check.liveStatus)}>
									{getComplianceStatusLabel(check.liveStatus)}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Planned Checks -->
		{#if plannedChecks.length > 0}
			<div class="fw-detail-section">
				<h3 class="fw-detail-section-title">Planned Checks</h3>
				<div class="fw-check-list">
					{#each plannedChecks as check (check.id)}
						<div class="fw-check-item planned">
							<div class="fw-check-info">
								<span class="fw-check-icon check-planned">○</span>
								<div>
									<div class="fw-check-name">{check.name}</div>
									<div class="fw-check-desc">{check.description}</div>
								</div>
							</div>
							<span class="planned-badge">Planned</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- In Scope -->
		{#if selectedFrameworkDetail && selectedFrameworkDetail.inScope.length > 0}
			<div class="fw-detail-section">
				<h3 class="fw-detail-section-title">In Scope</h3>
				<ul class="scope-list in-scope">
					{#each selectedFrameworkDetail.inScope as item (item)}
						<li><span class="scope-icon in">✓</span> {item}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Out of Scope -->
		{#if selectedFrameworkDetail && selectedFrameworkDetail.outOfScope.length > 0}
			<div class="fw-detail-section">
				<h3 class="fw-detail-section-title">Out of Scope</h3>
				<ul class="scope-list out-scope">
					{#each selectedFrameworkDetail.outOfScope as entry (entry.item)}
						<li>
							<span class="scope-icon out">○</span>
							<span>{entry.item}</span>
							<span class="scope-reason">— {entry.reason}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<button class="btn btn-secondary" onclick={closeFrameworkDetail}>Close</button>
	{/snippet}
</Modal>

<style>
	/* Framework card clickable state */
	.framework-card-clickable {
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}
	.framework-card-clickable:hover {
		border-color: var(--primary);
		box-shadow: 0 0 0 1px var(--primary);
	}
	.framework-card-clickable:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	/* Framework Detail Modal */
	.fw-detail-fullname {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin: 4px 0 0 0;
	}
	.fw-detail-body {
		margin-bottom: 0;
	}
	.fw-detail-description {
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0 0 20px 0;
	}
	.fw-detail-section {
		margin-bottom: 20px;
	}
	.fw-detail-section:last-child {
		margin-bottom: 0;
	}
	.fw-detail-section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 12px 0;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}

	/* Check items */
	.fw-check-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fw-check-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: var(--bg-subtle);
		gap: 12px;
	}
	.fw-check-item.planned {
		opacity: 0.6;
	}
	.fw-check-info {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}
	.fw-check-icon {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 1px;
	}
	.check-compliant,
	.check-implemented {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}
	.check-partial {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}
	.check-non_compliant {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}
	.check-planned {
		background: var(--bg-card);
		color: var(--text-tertiary);
		border: 1px dashed var(--border);
	}
	.fw-check-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}
	.fw-check-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin-top: 2px;
	}
	.planned-badge {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		background: var(--bg-card);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	/* Scope lists */
	.scope-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.scope-list li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 0.875rem;
		color: var(--text-primary);
		line-height: 1.4;
	}
	.scope-icon {
		flex-shrink: 0;
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.scope-icon.in {
		color: #22c55e;
	}
	.scope-icon.out {
		color: var(--text-tertiary);
	}
	.scope-reason {
		color: var(--text-tertiary);
		font-size: 0.8125rem;
	}
</style>
