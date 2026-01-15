/**
 * Admin Compliance API Client
 *
 * Provides methods for viewing compliance status, access reviews,
 * compliance reports, and data retention status.
 */

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || '';

/**
 * Handle API errors safely - avoid leaking internal error details in production
 */
async function handleAPIError(response: Response, fallbackMessage: string): Promise<Error> {
	try {
		const errorBody = await response.json();
		// In development, show detailed error; in production, use fallback
		if (import.meta.env.DEV) {
			return new Error(errorBody.error_description || errorBody.error || fallbackMessage);
		}
	} catch {
		// JSON parsing failed, use fallback
	}
	return new Error(fallbackMessage);
}

/**
 * Compliance framework types
 */
export type ComplianceFramework = 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'PCI-DSS' | 'CCPA';

/**
 * Compliance check status
 */
export type ComplianceCheckStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';

/**
 * Framework compliance summary
 */
export interface FrameworkSummary {
	framework: ComplianceFramework;
	status: ComplianceCheckStatus;
	compliant_checks: number;
	total_checks: number;
	last_checked: string;
	issues: string[];
}

/**
 * Recent compliance check result
 */
export interface ComplianceCheck {
	id: string;
	name: string;
	framework: ComplianceFramework;
	status: ComplianceCheckStatus;
	checked_at: string;
	details?: string;
}

/**
 * Data retention category status
 */
export interface RetentionCategoryStatus {
	category: string;
	retention_days: number;
	records_count: number;
	oldest_record?: string;
	next_cleanup?: string;
}

/**
 * Data retention status
 */
export interface DataRetentionStatus {
	enabled: boolean;
	categories: RetentionCategoryStatus[];
	gdpr_compliant: boolean;
	last_cleanup: string;
	next_scheduled_cleanup: string;
}

/**
 * Overall compliance status
 */
export interface ComplianceStatus {
	overall_status: ComplianceCheckStatus;
	frameworks: FrameworkSummary[];
	recent_checks: ComplianceCheck[];
	data_retention: {
		enabled: boolean;
		gdpr_compliant: boolean;
	};
	audit_log: {
		enabled: boolean;
		retention_days: number;
	};
	mfa_enforcement: {
		enabled: boolean;
		coverage_percent: number;
	};
	encryption: {
		at_rest: boolean;
		in_transit: boolean;
	};
	access_control: {
		rbac_enabled: boolean;
		last_review?: string;
	};
}

/**
 * Access review scope
 */
export type AccessReviewScope = 'all_users' | 'role' | 'organization' | 'inactive_users';

/**
 * Access review status
 */
export type AccessReviewStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Access review entry
 */
export interface AccessReview {
	id: string;
	tenant_id: string;
	name: string;
	scope: AccessReviewScope;
	scope_target?: string;
	status: AccessReviewStatus;
	total_users: number;
	reviewed_users: number;
	started_by: string;
	started_at: string;
	completed_at?: string;
	due_date?: string;
}

/**
 * Compliance report type
 */
export type ReportType = 'gdpr_dsar' | 'soc2_audit' | 'access_summary' | 'user_activity';

/**
 * Compliance report status
 */
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

/**
 * Compliance report entry
 */
export interface ComplianceReport {
	id: string;
	tenant_id: string;
	type: ReportType;
	status: ReportStatus;
	requested_by: string;
	requested_at: string;
	completed_at?: string;
	download_url?: string;
	expires_at?: string;
	parameters?: Record<string, unknown>;
}

/**
 * List response with cursor pagination
 */
export interface ListResponse<T> {
	data: T[];
	has_more: boolean;
	next_cursor?: string;
}

/**
 * Admin Compliance API
 */
export const adminComplianceAPI = {
	/**
	 * Get comprehensive compliance status
	 */
	async getStatus(): Promise<ComplianceStatus> {
		const response = await fetch(`${API_BASE_URL}/api/admin/compliance/status`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw await handleAPIError(response, 'Failed to get compliance status');
		}

		return response.json();
	},

	/**
	 * List access reviews
	 */
	async listAccessReviews(params?: {
		limit?: number;
		cursor?: string;
		status?: AccessReviewStatus;
	}): Promise<ListResponse<AccessReview>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		if (params?.status) searchParams.set('filter', `status=${params.status}`);

		const url = `${API_BASE_URL}/api/admin/compliance/access-reviews${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

		const response = await fetch(url, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw await handleAPIError(response, 'Failed to list access reviews');
		}

		return response.json();
	},

	/**
	 * Start a new access review
	 */
	async startAccessReview(params: {
		name: string;
		scope: AccessReviewScope;
		scope_target?: string;
		due_date?: string;
	}): Promise<AccessReview> {
		const response = await fetch(`${API_BASE_URL}/api/admin/compliance/access-reviews`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(params)
		});

		if (!response.ok) {
			throw await handleAPIError(response, 'Failed to start access review');
		}

		return response.json();
	},

	/**
	 * List compliance reports
	 */
	async listReports(params?: {
		limit?: number;
		cursor?: string;
		type?: ReportType;
	}): Promise<ListResponse<ComplianceReport>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		if (params?.type) searchParams.set('filter', `type=${params.type}`);

		const url = `${API_BASE_URL}/api/admin/compliance/reports${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

		const response = await fetch(url, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw await handleAPIError(response, 'Failed to list reports');
		}

		return response.json();
	},

	/**
	 * Get data retention status
	 */
	async getDataRetentionStatus(): Promise<DataRetentionStatus> {
		const response = await fetch(`${API_BASE_URL}/api/admin/data-retention/status`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw await handleAPIError(response, 'Failed to get data retention status');
		}

		return response.json();
	}
};

/**
 * Get status badge color based on compliance status
 */
export function getComplianceStatusColor(status: ComplianceCheckStatus): string {
	switch (status) {
		case 'compliant':
			return '#22c55e';
		case 'non_compliant':
			return '#ef4444';
		case 'partial':
			return '#f59e0b';
		case 'not_applicable':
			return '#6b7280';
		default:
			return '#6b7280';
	}
}

/**
 * Get human-readable status label
 */
export function getComplianceStatusLabel(status: ComplianceCheckStatus): string {
	switch (status) {
		case 'compliant':
			return 'Compliant';
		case 'non_compliant':
			return 'Non-Compliant';
		case 'partial':
			return 'Partial';
		case 'not_applicable':
			return 'N/A';
		default:
			return status;
	}
}

/**
 * Get framework display name
 */
export function getFrameworkDisplayName(framework: ComplianceFramework): string {
	switch (framework) {
		case 'GDPR':
			return 'GDPR';
		case 'HIPAA':
			return 'HIPAA';
		case 'SOC2':
			return 'SOC 2';
		case 'ISO27001':
			return 'ISO 27001';
		case 'PCI-DSS':
			return 'PCI DSS';
		case 'CCPA':
			return 'CCPA';
		default:
			return framework;
	}
}
