<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminSecurityAPI,
		getSeverityColor,
		getAlertStatusColor,
		getRiskLevelColor,
		getAlertTypeDisplayName,
		getThreatTypeDisplayName,
		type SecurityAlert,
		type SuspiciousActivity,
		type SecurityThreat,
		type IPReputationResult,
		type AlertStatus,
		type AlertSeverity
	} from '$lib/api/admin-security';
	import { formatDate, DEFAULT_PAGE_SIZE, sanitizeText } from '$lib/utils';

	// State
	let loading = $state(true);
	let error = $state('');
	let alerts = $state<SecurityAlert[]>([]);
	let suspiciousActivities = $state<SuspiciousActivity[]>([]);
	let threats = $state<SecurityThreat[]>([]);

	// Tabs
	let activeTab = $state<'alerts' | 'activities' | 'threats' | 'ip-check'>('alerts');

	// Filters
	let statusFilter = $state<AlertStatus | ''>('');
	let severityFilter = $state<AlertSeverity | ''>('');

	// IP Check
	let ipToCheck = $state('');
	let checkingIP = $state(false);
	let ipCheckResult = $state<IPReputationResult | null>(null);
	let ipCheckError = $state('');

	// Acknowledging
	let acknowledgingId = $state<string | null>(null);

	// Request counter to handle race conditions
	let alertsRequestId = 0;

	// Tab definitions with type safety
	type TabId = 'alerts' | 'activities' | 'threats' | 'ip-check';
	const TAB_DEFINITIONS: ReadonlyArray<{ id: TabId; label: string; getCount: () => number }> = [
		{ id: 'alerts', label: 'Alerts', getCount: () => openAlertsCount },
		{
			id: 'activities',
			label: 'Suspicious Activities',
			getCount: () => suspiciousActivities.length
		},
		{ id: 'threats', label: 'Threats', getCount: () => detectedThreatsCount },
		{ id: 'ip-check', label: 'IP Check', getCount: () => 0 }
	];

	// Sanitize API responses to prevent XSS (defense in depth)
	function sanitizeAlert(alert: SecurityAlert): SecurityAlert {
		return {
			...alert,
			title: sanitizeText(alert.title),
			description: sanitizeText(alert.description),
			user_email: alert.user_email ? sanitizeText(alert.user_email) : undefined
		};
	}

	function sanitizeActivity(activity: SuspiciousActivity): SuspiciousActivity {
		return {
			...activity,
			description: sanitizeText(activity.description),
			user_email: activity.user_email ? sanitizeText(activity.user_email) : undefined
		};
	}

	function sanitizeThreat(threat: SecurityThreat): SecurityThreat {
		return {
			...threat,
			title: sanitizeText(threat.title),
			description: sanitizeText(threat.description),
			indicators: Array.isArray(threat.indicators)
				? threat.indicators.map((i) => sanitizeText(i))
				: []
		};
	}

	async function loadAlerts(): Promise<void> {
		const requestId = ++alertsRequestId;
		const params: { status?: AlertStatus; severity?: AlertSeverity } = {};
		if (statusFilter) params.status = statusFilter;
		if (severityFilter) params.severity = severityFilter;

		const response = await adminSecurityAPI.listAlerts({ ...params, limit: DEFAULT_PAGE_SIZE });

		// Only update if this is still the latest request
		if (requestId === alertsRequestId) {
			// Defensive check: ensure response.data is an array
			// Apply sanitization to prevent XSS
			alerts = Array.isArray(response.data) ? response.data.map(sanitizeAlert) : [];
		}
	}

	async function loadSuspiciousActivities(): Promise<void> {
		const response = await adminSecurityAPI.listSuspiciousActivities({ limit: DEFAULT_PAGE_SIZE });
		// Defensive check: ensure response.data is an array
		// Apply sanitization to prevent XSS
		suspiciousActivities = Array.isArray(response.data) ? response.data.map(sanitizeActivity) : [];
	}

	async function loadThreats(): Promise<void> {
		const response = await adminSecurityAPI.listThreats({ limit: DEFAULT_PAGE_SIZE });
		// Defensive check: ensure response.data is an array
		// Apply sanitization to prevent XSS
		threats = Array.isArray(response.data) ? response.data.map(sanitizeThreat) : [];
	}

	async function loadData() {
		loading = true;
		error = '';

		const results = await Promise.allSettled([
			loadAlerts(),
			loadSuspiciousActivities(),
			loadThreats()
		]);

		// Collect all errors
		const errors: string[] = [];
		const names = ['Alerts', 'Suspicious Activities', 'Threats'];
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				const message =
					result.reason instanceof Error ? result.reason.message : `Failed to load ${names[index]}`;
				errors.push(message);
			}
		});

		if (errors.length > 0) {
			error = errors.length === 1 ? errors[0] : `Multiple errors: ${errors.join('; ')}`;
		}

		loading = false;
	}

	onMount(() => {
		loadData();
	});

	async function acknowledgeAlert(alertId: string) {
		acknowledgingId = alertId;
		error = ''; // Clear previous errors
		try {
			const updated = await adminSecurityAPI.acknowledgeAlert(alertId);
			// Apply sanitization to prevent XSS
			alerts = alerts.map((a) => (a.id === alertId ? sanitizeAlert(updated) : a));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to acknowledge alert';
		} finally {
			acknowledgingId = null;
		}
	}

	/**
	 * Validate IP address format (IPv4 or IPv6)
	 */
	function isValidIPAddress(ip: string): boolean {
		// IPv4: 0-255.0-255.0-255.0-255
		const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const ipv4Match = ip.match(ipv4Regex);
		if (ipv4Match) {
			return ipv4Match.slice(1).every((octet) => {
				const num = parseInt(octet, 10);
				return num >= 0 && num <= 255;
			});
		}

		// IPv6: simplified check for valid hex groups separated by colons
		// Supports full form and :: abbreviation
		const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
		return ipv6Regex.test(ip);
	}

	async function checkIPReputation() {
		const trimmedIP = ipToCheck.trim();

		if (!trimmedIP) {
			ipCheckError = 'Please enter an IP address';
			return;
		}

		if (!isValidIPAddress(trimmedIP)) {
			ipCheckError = 'Invalid IP address format. Please enter a valid IPv4 or IPv6 address.';
			return;
		}

		checkingIP = true;
		ipCheckError = '';
		ipCheckResult = null;

		try {
			ipCheckResult = await adminSecurityAPI.checkIPReputation(trimmedIP);
		} catch (e) {
			ipCheckError = e instanceof Error ? e.message : 'Failed to check IP reputation';
		} finally {
			checkingIP = false;
		}
	}

	// Track if initial data load has completed
	let initialLoadComplete = false;
	// Track previous filter values to detect actual changes
	let prevStatusFilter = '';
	let prevSeverityFilter = '';

	// Memoized tab counts to avoid recalculation on every render
	let openAlertsCount = $derived(alerts.filter((a) => a.status === 'open').length);
	let detectedThreatsCount = $derived(threats.filter((t) => t.status === 'detected').length);

	// Reactive filter effect - reload alerts when filters change
	$effect(() => {
		const currentStatus = statusFilter;
		const currentSeverity = severityFilter;
		const currentTab = activeTab;
		const isLoading = loading;

		// Skip effect during initial mount (onMount handles first load)
		if (!initialLoadComplete) {
			if (!isLoading) {
				initialLoadComplete = true;
				prevStatusFilter = currentStatus;
				prevSeverityFilter = currentSeverity;
			}
			return;
		}

		// Only reload if filters actually changed
		const filtersChanged =
			currentStatus !== prevStatusFilter || currentSeverity !== prevSeverityFilter;

		if (currentTab === 'alerts' && !isLoading && filtersChanged) {
			prevStatusFilter = currentStatus;
			prevSeverityFilter = currentSeverity;
			// Wrap in async IIFE to handle errors
			(async () => {
				try {
					await loadAlerts();
				} catch (e) {
					error = e instanceof Error ? e.message : 'Failed to load alerts';
				}
			})();
		}
	});
</script>

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">Security</h1>
		<button
			onclick={loadData}
			disabled={loading}
			style="
				padding: 8px 16px;
				background-color: #f3f4f6;
				color: #374151;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
			"
		>
			Refresh
		</button>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		Monitor security alerts, suspicious activities, detected threats, and check IP reputation.
	</p>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	<!-- Tabs -->
	<div
		style="display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb;"
		role="tablist"
	>
		{#each TAB_DEFINITIONS as tab (tab.id)}
			{@const tabCount = tab.getCount()}
			<button
				onclick={() => {
					error = ''; // Clear errors when switching tabs
					activeTab = tab.id;
				}}
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls="{tab.id}-panel"
				style="
					padding: 12px 24px;
					background: none;
					border: none;
					border-bottom: 2px solid {activeTab === tab.id ? '#3b82f6' : 'transparent'};
					color: {activeTab === tab.id ? '#3b82f6' : '#6b7280'};
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					display: flex;
					align-items: center;
					gap: 8px;
				"
			>
				{tab.label}
				{#if tabCount > 0}
					<span
						style="
							background-color: {tab.id === 'alerts' ? '#ef4444' : '#6b7280'};
							color: white;
							font-size: 11px;
							padding: 2px 6px;
							border-radius: 9999px;
						"
						aria-label="{tabCount} items"
					>
						{tabCount}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading security data...</div>
	{:else if activeTab === 'alerts'}
		<!-- Alerts Tab -->
		<div>
			<!-- Filters -->
			<div
				style="display: flex; gap: 16px; margin-bottom: 16px; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;"
			>
				<div>
					<label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;"
						>Status</label
					>
					<select
						bind:value={statusFilter}
						style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
					>
						<option value="">All Status</option>
						<option value="open">Open</option>
						<option value="acknowledged">Acknowledged</option>
						<option value="resolved">Resolved</option>
						<option value="dismissed">Dismissed</option>
					</select>
				</div>
				<div>
					<label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;"
						>Severity</label
					>
					<select
						bind:value={severityFilter}
						style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
					>
						<option value="">All Severities</option>
						<option value="critical">Critical</option>
						<option value="high">High</option>
						<option value="medium">Medium</option>
						<option value="low">Low</option>
						<option value="info">Info</option>
					</select>
				</div>
			</div>

			{#if alerts.length === 0}
				<div
					style="text-align: center; padding: 48px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
				>
					<p style="color: #6b7280; margin: 0;">No security alerts found.</p>
				</div>
			{:else}
				<div style="display: grid; gap: 12px;">
					{#each alerts as alert (alert.id)}
						<div
							style="
								background: white;
								border-radius: 8px;
								border: 1px solid #e5e7eb;
								border-left: 4px solid {getSeverityColor(alert.severity)};
								padding: 16px 20px;
							"
						>
							<div
								style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;"
							>
								<div style="display: flex; align-items: center; gap: 12px;">
									<span
										style="
											padding: 4px 10px;
											border-radius: 4px;
											font-size: 12px;
											font-weight: 600;
											background-color: {getSeverityColor(alert.severity)}15;
											color: {getSeverityColor(alert.severity)};
										"
									>
										{alert.severity.toUpperCase()}
									</span>
									<span
										style="
											padding: 4px 10px;
											border-radius: 4px;
											font-size: 12px;
											font-weight: 500;
											background-color: {getAlertStatusColor(alert.status)}15;
											color: {getAlertStatusColor(alert.status)};
										"
									>
										{alert.status}
									</span>
									<span style="font-size: 12px; color: #6b7280;">
										{getAlertTypeDisplayName(alert.type)}
									</span>
								</div>
								<span style="font-size: 12px; color: #9ca3af;">
									{formatDate(alert.created_at)}
								</span>
							</div>
							<h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">
								{alert.title}
							</h3>
							<p style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">
								{alert.description}
							</p>
							<div style="display: flex; justify-content: space-between; align-items: center;">
								<div style="display: flex; gap: 16px; font-size: 12px; color: #6b7280;">
									{#if alert.source_ip}
										<span>IP: {alert.source_ip}</span>
									{/if}
									{#if alert.user_email}
										<span>User: {alert.user_email}</span>
									{/if}
								</div>
								{#if alert.status === 'open'}
									<button
										onclick={() => acknowledgeAlert(alert.id)}
										disabled={acknowledgingId === alert.id}
										style="
											padding: 6px 12px;
											background-color: #f59e0b;
											color: white;
											border: none;
											border-radius: 4px;
											font-size: 12px;
											cursor: pointer;
											opacity: {acknowledgingId === alert.id ? 0.7 : 1};
										"
									>
										{acknowledgingId === alert.id ? 'Acknowledging...' : 'Acknowledge'}
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else if activeTab === 'activities'}
		<!-- Suspicious Activities Tab -->
		<div>
			{#if suspiciousActivities.length === 0}
				<div
					style="text-align: center; padding: 48px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
				>
					<p style="color: #6b7280; margin: 0;">No suspicious activities detected.</p>
				</div>
			{:else}
				<div style="display: grid; gap: 12px;">
					{#each suspiciousActivities as activity (activity.id)}
						<div
							style="
								background: white;
								border-radius: 8px;
								border: 1px solid #e5e7eb;
								border-left: 4px solid {getSeverityColor(activity.severity)};
								padding: 16px 20px;
							"
						>
							<div
								style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;"
							>
								<div style="display: flex; align-items: center; gap: 12px;">
									<span
										style="
											padding: 4px 10px;
											border-radius: 4px;
											font-size: 12px;
											font-weight: 600;
											background-color: {getSeverityColor(activity.severity)}15;
											color: {getSeverityColor(activity.severity)};
										"
									>
										{activity.severity.toUpperCase()}
									</span>
									<span style="font-size: 12px; color: #6b7280;">
										{activity.type.replace(/_/g, ' ')}
									</span>
								</div>
								<div style="display: flex; align-items: center; gap: 8px;">
									<span style="font-size: 12px; color: #6b7280;">Risk Score:</span>
									<span
										style="
											font-size: 14px;
											font-weight: 600;
											color: {activity.risk_score >= 80 ? '#ef4444' : activity.risk_score >= 50 ? '#f59e0b' : '#22c55e'};
										"
									>
										{activity.risk_score}
									</span>
								</div>
							</div>
							<p style="font-size: 14px; color: #374151; margin: 0 0 12px 0;">
								{activity.description}
							</p>
							<div style="display: flex; gap: 16px; font-size: 12px; color: #6b7280;">
								{#if activity.source_ip}
									<span>IP: {activity.source_ip}</span>
								{/if}
								{#if activity.user_email}
									<span>User: {activity.user_email}</span>
								{/if}
								<span>Detected: {formatDate(activity.detected_at)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else if activeTab === 'threats'}
		<!-- Threats Tab -->
		<div>
			{#if threats.length === 0}
				<div
					style="text-align: center; padding: 48px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
				>
					<p style="color: #6b7280; margin: 0;">No threats detected.</p>
				</div>
			{:else}
				<div style="display: grid; gap: 12px;">
					{#each threats as threat (threat.id)}
						<div
							style="
								background: white;
								border-radius: 8px;
								border: 1px solid #e5e7eb;
								border-left: 4px solid {getSeverityColor(threat.severity)};
								padding: 16px 20px;
							"
						>
							<div
								style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;"
							>
								<div style="display: flex; align-items: center; gap: 12px;">
									<span
										style="
											padding: 4px 10px;
											border-radius: 4px;
											font-size: 12px;
											font-weight: 600;
											background-color: {getSeverityColor(threat.severity)}15;
											color: {getSeverityColor(threat.severity)};
										"
									>
										{threat.severity.toUpperCase()}
									</span>
									<span
										style="
											padding: 4px 10px;
											border-radius: 4px;
											font-size: 12px;
											font-weight: 500;
											background-color: {threat.status === 'mitigated'
											? '#22c55e'
											: threat.status === 'investigating'
												? '#f59e0b'
												: '#ef4444'}15;
											color: {threat.status === 'mitigated'
											? '#22c55e'
											: threat.status === 'investigating'
												? '#f59e0b'
												: '#ef4444'};
										"
									>
										{threat.status}
									</span>
									<span style="font-size: 12px; color: #6b7280;">
										{getThreatTypeDisplayName(threat.type)}
									</span>
								</div>
								<span style="font-size: 12px; color: #9ca3af;">
									{formatDate(threat.detected_at)}
								</span>
							</div>
							<h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">
								{threat.title}
							</h3>
							<p style="font-size: 14px; color: #6b7280; margin: 0;">
								{threat.description}
							</p>
							{#if Array.isArray(threat.indicators) && threat.indicators.length > 0}
								<div style="margin-top: 12px;">
									<span style="font-size: 12px; color: #6b7280;">Indicators:</span>
									<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
										{#each threat.indicators as indicator (indicator)}
											<span
												style="
													font-size: 11px;
													padding: 2px 6px;
													background-color: #f3f4f6;
													border-radius: 4px;
													color: #374151;
													font-family: monospace;
												"
											>
												{indicator}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else if activeTab === 'ip-check'}
		<!-- IP Check Tab -->
		<div
			style="max-width: 600px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px;"
		>
			<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
				IP Reputation Check
			</h2>
			<p style="color: #6b7280; margin: 0 0 16px 0;">
				Check the reputation and risk level of an IP address.
			</p>

			<div style="display: flex; gap: 12px; margin-bottom: 16px;">
				<input
					type="text"
					bind:value={ipToCheck}
					placeholder="Enter IP address (e.g., 192.168.1.1)"
					style="
						flex: 1;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
					"
					onkeydown={(e) => e.key === 'Enter' && checkIPReputation()}
				/>
				<button
					onclick={checkIPReputation}
					disabled={checkingIP}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {checkingIP ? 0.7 : 1};
					"
				>
					{checkingIP ? 'Checking...' : 'Check'}
				</button>
			</div>

			{#if ipCheckError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{ipCheckError}
				</div>
			{/if}

			{#if ipCheckResult}
				<div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
					<div
						style="
							padding: 16px;
							background-color: {getRiskLevelColor(ipCheckResult.risk_level)}10;
							border-bottom: 1px solid #e5e7eb;
						"
					>
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<div style="font-size: 14px; color: #6b7280;">IP Address</div>
								<div
									style="font-size: 18px; font-weight: 600; color: #1f2937; font-family: monospace;"
								>
									{ipCheckResult.ip}
								</div>
							</div>
							<div style="text-align: right;">
								<div style="font-size: 14px; color: #6b7280;">Risk Level</div>
								<div
									style="
										font-size: 18px;
										font-weight: 600;
										color: {getRiskLevelColor(ipCheckResult.risk_level)};
									"
								>
									{ipCheckResult.risk_level.toUpperCase()}
								</div>
							</div>
						</div>
					</div>
					<div style="padding: 16px;">
						<div
							style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;"
						>
							<div>
								<div style="font-size: 12px; color: #6b7280;">Risk Score</div>
								<div style="font-size: 20px; font-weight: 600; color: #1f2937;">
									{ipCheckResult.risk_score}/100
								</div>
							</div>
							<div>
								<div style="font-size: 12px; color: #6b7280;">Failed Auth (24h)</div>
								<div style="font-size: 20px; font-weight: 600; color: #1f2937;">
									{ipCheckResult.failed_auth_attempts_24h}
								</div>
							</div>
							<div>
								<div style="font-size: 12px; color: #6b7280;">Rate Limit Violations</div>
								<div style="font-size: 20px; font-weight: 600; color: #1f2937;">
									{ipCheckResult.rate_limit_violations_24h}
								</div>
							</div>
						</div>

						<div
							style="
								padding: 12px;
								background-color: {ipCheckResult.is_blocked ? '#fee2e2' : '#f0fdf4'};
								border-radius: 6px;
								margin-bottom: 16px;
							"
						>
							<span
								style="font-weight: 600; color: {ipCheckResult.is_blocked ? '#b91c1c' : '#166534'};"
							>
								{ipCheckResult.is_blocked ? '⛔ This IP is BLOCKED' : '✓ This IP is NOT blocked'}
							</span>
						</div>

						{#if ipCheckResult.recommendations.length > 0}
							<div>
								<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
									Recommendations
								</div>
								<ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
									{#each ipCheckResult.recommendations as rec (rec)}
										<li style="margin-bottom: 4px;">{rec}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
