<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminJobsAPI,
		getJobStatusColor,
		getJobTypeDisplayName,
		getReportTypeDisplayName,
		formatJobDuration,
		type Job,
		type JobStatus,
		type JobType,
		type ReportType
	} from '$lib/api/admin-jobs';
	import {
		formatDate,
		isValidDownloadUrl,
		DEFAULT_PAGE_SIZE,
		JOB_POLLING_INTERVAL,
		sanitizeText
	} from '$lib/utils';

	// State
	let loading = $state(true);
	let error = $state('');
	let jobs = $state<Job[]>([]);

	// Filters
	let statusFilter = $state<JobStatus | ''>('');
	let typeFilter = $state<JobType | ''>('');

	// Create Report Dialog
	let showCreateReportDialog = $state(false);
	let creatingReport = $state(false);
	let createReportError = $state('');
	let reportType = $state<ReportType>('user_activity');
	let reportFromDate = $state('');
	let reportToDate = $state('');

	// Job Detail Dialog
	let showJobDetailDialog = $state(false);
	let selectedJob = $state<Job | null>(null);
	let loadingJobDetail = $state(false);

	// Polling for running jobs
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let isPolling = false; // Prevent duplicate API calls during polling

	// Sanitize API response fields to prevent XSS (defense in depth)
	function sanitizeJob(job: Job): Job {
		return {
			...job,
			created_by: sanitizeText(job.created_by),
			progress: job.progress
				? {
						...job.progress,
						current_item: job.progress.current_item
							? sanitizeText(job.progress.current_item)
							: undefined
					}
				: undefined,
			result: job.result
				? {
						...job.result,
						failures: job.result.failures.map((f) => ({
							...f,
							error: f.error ? sanitizeText(f.error) : undefined
						}))
					}
				: undefined
		};
	}

	async function loadJobs() {
		try {
			const params: { status?: JobStatus; type?: JobType } = {};
			if (statusFilter) params.status = statusFilter;
			if (typeFilter) params.type = typeFilter;

			const response = await adminJobsAPI.list({ ...params, limit: DEFAULT_PAGE_SIZE });
			// Defensive check: ensure response.data is an array
			// Apply sanitization to prevent XSS
			jobs = Array.isArray(response.data) ? response.data.map(sanitizeJob) : [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load jobs';
		}
	}

	async function loadData() {
		loading = true;
		error = '';
		await loadJobs();
		loading = false;
	}

	onMount(() => {
		loadData();

		// Poll for updates if there are running jobs
		pollingInterval = setInterval(async () => {
			const hasRunningJobs = jobs.some((j) => j.status === 'pending' || j.status === 'running');
			// Only poll if there are running jobs and not already polling
			if (hasRunningJobs && !isPolling) {
				isPolling = true;
				try {
					await loadJobs();
				} catch (e) {
					// Log polling errors in development for debugging, but don't show to user
					if (import.meta.env.DEV) {
						console.warn('[Jobs Polling] Failed to refresh:', e instanceof Error ? e.message : e);
					}
				} finally {
					isPolling = false;
				}
			}
		}, JOB_POLLING_INTERVAL);

		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
				pollingInterval = null;
			}
		};
	});

	function openCreateReportDialog() {
		reportType = 'user_activity';
		reportFromDate = '';
		reportToDate = '';
		createReportError = '';
		showCreateReportDialog = true;
	}

	function closeCreateReportDialog() {
		showCreateReportDialog = false;
	}

	const MAX_DATE_RANGE_DAYS = 730; // 2 years

	async function handleCreateReport() {
		createReportError = '';

		// Validate date range
		if (reportFromDate || reportToDate) {
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			if (reportFromDate && reportToDate) {
				const from = new Date(reportFromDate);
				const to = new Date(reportToDate);

				if (from > to) {
					createReportError = 'From date must be before To date';
					return;
				}

				// Check for future dates
				if (to > today) {
					createReportError = 'To date cannot be in the future';
					return;
				}

				// Check date range limit
				const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
				if (daysDiff > MAX_DATE_RANGE_DAYS) {
					createReportError = `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days (${Math.floor(MAX_DATE_RANGE_DAYS / 365)} years)`;
					return;
				}
			}

			// Single date validation
			if (reportToDate) {
				const to = new Date(reportToDate);
				if (to > today) {
					createReportError = 'To date cannot be in the future';
					return;
				}
			}
		}

		creatingReport = true;

		try {
			const params: {
				type: ReportType;
				parameters?: { from?: string; to?: string };
			} = { type: reportType };

			if (reportFromDate || reportToDate) {
				params.parameters = {};
				if (reportFromDate) params.parameters.from = new Date(reportFromDate).toISOString();
				if (reportToDate) params.parameters.to = new Date(reportToDate).toISOString();
			}

			const job = await adminJobsAPI.createReport(params);
			jobs = [job, ...jobs];
			closeCreateReportDialog();
		} catch (e) {
			createReportError = e instanceof Error ? e.message : 'Failed to create report job';
		} finally {
			creatingReport = false;
		}
	}

	async function viewJobDetail(job: Job) {
		selectedJob = job;
		showJobDetailDialog = true;
		loadingJobDetail = true;

		try {
			const updatedJob = await adminJobsAPI.get(job.id);
			selectedJob = updatedJob;
		} catch {
			// Keep the original job data if refresh fails
		} finally {
			loadingJobDetail = false;
		}
	}

	function closeJobDetailDialog() {
		showJobDetailDialog = false;
		selectedJob = null;
		loadingJobDetail = false; // Clear loading state
	}

	function getProgressPercent(job: Job): number {
		if (job.progress) {
			const percentage = job.progress.percentage;
			// Defensive check: ensure percentage is a valid number
			if (typeof percentage === 'number' && !isNaN(percentage) && isFinite(percentage)) {
				// Clamp to 0-100 to prevent UI overflow
				return Math.min(100, Math.max(0, percentage));
			}
		}
		if (job.status === 'completed') return 100;
		if (job.status === 'pending') return 0;
		return 50; // Running without progress info
	}

	// Track if initial data load has completed
	let initialLoadComplete = false;
	// Track previous filter values to detect actual changes
	let prevStatusFilter = '';
	let prevTypeFilter = '';

	// Reactive filter effect - reload jobs when filters change
	$effect(() => {
		const currentStatus = statusFilter;
		const currentType = typeFilter;
		const isLoading = loading;

		// Skip effect during initial mount (onMount handles first load)
		if (!initialLoadComplete) {
			if (!isLoading) {
				initialLoadComplete = true;
				prevStatusFilter = currentStatus;
				prevTypeFilter = currentType;
			}
			return;
		}

		// Only reload if filters actually changed
		const filtersChanged = currentStatus !== prevStatusFilter || currentType !== prevTypeFilter;

		if (!isLoading && filtersChanged) {
			error = ''; // Clear errors when filters change
			prevStatusFilter = currentStatus;
			prevTypeFilter = currentType;
			void loadJobs();
		}
	});

	// Global Escape key handler for dialogs
	// Priority: JobDetail > CreateReport (JobDetail appears on top if both were somehow open)
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showJobDetailDialog) {
				closeJobDetailDialog();
			} else if (showCreateReportDialog) {
				closeCreateReportDialog();
			}
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">Jobs</h1>
		<button
			onclick={openCreateReportDialog}
			style="
				padding: 10px 20px;
				background-color: #3b82f6;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-weight: 500;
				font-size: 14px;
			"
		>
			Generate Report
		</button>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		Monitor background jobs including user imports, bulk updates, and report generation. Jobs
		automatically refresh while running.
	</p>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

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
				<option value="pending">Pending</option>
				<option value="running">Running</option>
				<option value="completed">Completed</option>
				<option value="failed">Failed</option>
				<option value="cancelled">Cancelled</option>
			</select>
		</div>
		<div>
			<label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;"
				>Type</label
			>
			<select
				bind:value={typeFilter}
				style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
			>
				<option value="">All Types</option>
				<option value="users_import">User Import</option>
				<option value="users_bulk_update">Bulk Update</option>
				<option value="report_generation">Report Generation</option>
				<option value="org_bulk_members">Org Bulk Members</option>
			</select>
		</div>
		<div style="margin-left: auto; display: flex; align-items: flex-end;">
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
	</div>

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading jobs...</div>
	{:else if jobs.length === 0}
		<div
			style="text-align: center; padding: 48px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0; color: #6b7280;">No jobs found.</p>
			{#if statusFilter || typeFilter}
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">
					Current filters:
					{#if statusFilter}<span
							style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin-left: 4px;"
							>{statusFilter}</span
						>{/if}
					{#if typeFilter}<span
							style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin-left: 4px;"
							>{getJobTypeDisplayName(typeFilter)}</span
						>{/if}
				</p>
				<button
					onclick={() => {
						statusFilter = '';
						typeFilter = '';
					}}
					style="padding: 6px 12px; background: none; border: 1px solid #d1d5db; border-radius: 6px; color: #374151; cursor: pointer; font-size: 14px;"
				>
					Clear filters
				</button>
			{:else}
				<p style="margin: 0; font-size: 14px; color: #9ca3af;">
					Generate a report or import users to create a job.
				</p>
			{/if}
		</div>
	{:else}
		<div
			style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;"
		>
			<table style="width: 100%; border-collapse: collapse;">
				<thead>
					<tr style="background-color: #f9fafb;">
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Type</th
						>
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Status</th
						>
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Progress</th
						>
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Duration</th
						>
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Created</th
						>
						<th
							style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody>
					{#each jobs as job (job.id)}
						<tr style="border-top: 1px solid #e5e7eb;">
							<td style="padding: 12px 16px;">
								<div style="font-weight: 500; color: #1f2937;">
									{getJobTypeDisplayName(job.type)}
								</div>
								<div style="font-size: 12px; color: #6b7280; font-family: monospace;">
									{job.id.substring(0, 8)}...
								</div>
							</td>
							<td style="padding: 12px 16px;">
								<span
									style="
										display: inline-flex;
										align-items: center;
										gap: 6px;
										padding: 4px 10px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										background-color: {getJobStatusColor(job.status)}15;
										color: {getJobStatusColor(job.status)};
									"
								>
									{#if job.status === 'running'}
										<span
											style="
												width: 6px;
												height: 6px;
												border-radius: 50%;
												background-color: {getJobStatusColor(job.status)};
												animation: pulse 1s ease-in-out infinite;
											"
										></span>
									{/if}
									{job.status}
								</span>
							</td>
							<td style="padding: 12px 16px;">
								<div style="display: flex; align-items: center; gap: 8px;">
									<div
										style="flex: 1; height: 6px; background-color: #e5e7eb; border-radius: 3px; overflow: hidden; max-width: 100px;"
									>
										<div
											style="
												height: 100%;
												width: {getProgressPercent(job)}%;
												background-color: {getJobStatusColor(job.status)};
												transition: width 0.3s ease;
											"
										></div>
									</div>
									<span style="font-size: 12px; color: #6b7280;">
										{getProgressPercent(job)}%
									</span>
								</div>
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								{formatJobDuration(job.started_at, job.completed_at)}
							</td>
							<td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">
								{formatDate(job.created_at)}
							</td>
							<td style="padding: 12px 16px;">
								<button
									onclick={() => viewJobDetail(job)}
									style="
										padding: 6px 12px;
										background-color: #f3f4f6;
										color: #374151;
										border: none;
										border-radius: 4px;
										font-size: 12px;
										cursor: pointer;
									"
								>
									View Details
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Create Report Dialog -->
{#if showCreateReportDialog}
	<div
		style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50;"
		onclick={closeCreateReportDialog}
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-report-dialog-title"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2
				id="create-report-dialog-title"
				style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;"
			>
				Generate Report
			</h2>

			{#if createReportError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{createReportError}
				</div>
			{/if}

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Report Type
				</label>
				<select
					bind:value={reportType}
					style="
						width: 100%;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						box-sizing: border-box;
					"
				>
					<option value="user_activity">{getReportTypeDisplayName('user_activity')}</option>
					<option value="access_summary">{getReportTypeDisplayName('access_summary')}</option>
					<option value="compliance_audit">{getReportTypeDisplayName('compliance_audit')}</option>
					<option value="security_events">{getReportTypeDisplayName('security_events')}</option>
				</select>
			</div>

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
				<div>
					<label
						style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
					>
						From Date (optional)
					</label>
					<input
						type="date"
						bind:value={reportFromDate}
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
				<div>
					<label
						style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
					>
						To Date (optional)
					</label>
					<input
						type="date"
						bind:value={reportToDate}
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
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeCreateReportDialog}
					disabled={creatingReport}
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
					onclick={handleCreateReport}
					disabled={creatingReport}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {creatingReport ? 0.7 : 1};
					"
				>
					{creatingReport ? 'Creating...' : 'Generate Report'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Job Detail Dialog -->
{#if showJobDetailDialog && selectedJob}
	<div
		style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50;"
		onclick={closeJobDetailDialog}
		role="dialog"
		aria-modal="true"
		aria-labelledby="job-detail-dialog-title"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<div
				style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;"
			>
				<div>
					<h2
						id="job-detail-dialog-title"
						style="font-size: 18px; font-weight: bold; margin: 0 0 4px 0; color: #1f2937;"
					>
						{getJobTypeDisplayName(selectedJob.type)}
					</h2>
					<div style="font-size: 12px; color: #6b7280; font-family: monospace;">
						{selectedJob.id}
					</div>
				</div>
				<button
					onclick={closeJobDetailDialog}
					aria-label="Close dialog"
					style="
						background: none;
						border: none;
						font-size: 24px;
						color: #9ca3af;
						cursor: pointer;
						line-height: 1;
					"
				>
					×
				</button>
			</div>

			{#if loadingJobDetail}
				<div style="text-align: center; padding: 24px; color: #6b7280;">Loading...</div>
			{:else}
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
					<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
						<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Status</div>
						<span
							style="
								padding: 4px 10px;
								border-radius: 9999px;
								font-size: 12px;
								font-weight: 500;
								background-color: {getJobStatusColor(selectedJob.status)}15;
								color: {getJobStatusColor(selectedJob.status)};
							"
						>
							{selectedJob.status}
						</span>
					</div>
					<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
						<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Duration</div>
						<div style="font-size: 14px; color: #374151;">
							{formatJobDuration(selectedJob.started_at, selectedJob.completed_at)}
						</div>
					</div>
					<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
						<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Created</div>
						<div style="font-size: 14px; color: #374151;">
							{formatDate(selectedJob.created_at)}
						</div>
					</div>
					<div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
						<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Created By</div>
						<div style="font-size: 14px; color: #374151;">{selectedJob.created_by}</div>
					</div>
				</div>

				{#if selectedJob.progress}
					<div style="margin-bottom: 16px;">
						<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
							Progress
						</div>
						<div style="display: flex; align-items: center; gap: 12px;">
							<div
								style="flex: 1; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;"
							>
								<div
									style="
										height: 100%;
										width: {getProgressPercent(selectedJob)}%;
										background-color: {getJobStatusColor(selectedJob.status)};
									"
								></div>
							</div>
							<span style="font-size: 14px; color: #374151;">
								{selectedJob.progress.processed}/{selectedJob.progress.total}
							</span>
						</div>
						{#if selectedJob.progress.current_item}
							<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
								Processing: {selectedJob.progress.current_item}
							</div>
						{/if}
					</div>
				{/if}

				{#if selectedJob.result}
					<div style="margin-bottom: 16px;">
						<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
							Result Summary
						</div>
						<div
							style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;"
						>
							<div
								style="background: #f0fdf4; padding: 12px; border-radius: 6px; text-align: center;"
							>
								<div style="font-size: 20px; font-weight: 600; color: #22c55e;">
									{selectedJob.result.summary.success_count}
								</div>
								<div style="font-size: 12px; color: #6b7280;">Succeeded</div>
							</div>
							<div
								style="background: #fef2f2; padding: 12px; border-radius: 6px; text-align: center;"
							>
								<div style="font-size: 20px; font-weight: 600; color: #ef4444;">
									{selectedJob.result.summary.failure_count}
								</div>
								<div style="font-size: 12px; color: #6b7280;">Failed</div>
							</div>
							<div
								style="background: #f9fafb; padding: 12px; border-radius: 6px; text-align: center;"
							>
								<div style="font-size: 20px; font-weight: 600; color: #6b7280;">
									{selectedJob.result.summary.skipped_count}
								</div>
								<div style="font-size: 12px; color: #6b7280;">Skipped</div>
							</div>
						</div>

						{#if selectedJob.result.failures.length > 0}
							<div style="margin-top: 12px;">
								<div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
									Failures ({selectedJob.result.failures.length})
								</div>
								<div
									style="max-height: 200px; overflow-y: auto; background: #f9fafb; border-radius: 6px; padding: 12px;"
								>
									{#each selectedJob.result.failures.slice(0, 10) as failure, i (i)}
										<div
											style="font-size: 12px; color: #ef4444; padding: 4px 0; border-bottom: 1px solid #e5e7eb;"
										>
											{#if failure.line}Line {failure.line}:
											{/if}{failure.error || 'Unknown error'}
										</div>
									{/each}
									{#if selectedJob.result.failures.length > 10}
										<div style="font-size: 12px; color: #6b7280; padding-top: 8px;">
											... and {selectedJob.result.failures.length - 10} more
										</div>
									{/if}
								</div>
							</div>
						{/if}

						{#if selectedJob.result.download_url && isValidDownloadUrl(selectedJob.result.download_url)}
							<div style="margin-top: 12px;">
								<a
									href={selectedJob.result.download_url}
									target="_blank"
									rel="noopener noreferrer"
									style="
										display: inline-block;
										padding: 8px 16px;
										background-color: #3b82f6;
										color: white;
										border-radius: 6px;
										text-decoration: none;
										font-size: 14px;
									"
								>
									Download Result
								</a>
							</div>
						{/if}
					</div>
				{/if}

				{#if selectedJob.parameters && Object.keys(selectedJob.parameters).length > 0}
					<div>
						<div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
							Parameters
						</div>
						<pre
							style="
								background: #f9fafb;
								padding: 12px;
								border-radius: 6px;
								font-size: 12px;
								overflow-x: auto;
								margin: 0;
							">{JSON.stringify(selectedJob.parameters, null, 2)}</pre>
					</div>
				{/if}
			{/if}

			<div style="display: flex; justify-content: flex-end; margin-top: 16px;">
				<button
					onclick={closeJobDetailDialog}
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
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
