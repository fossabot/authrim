import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	formatJobDuration,
	getJobStatusColor,
	getJobTypeDisplayName,
	getReportTypeDisplayName
} from './admin-jobs';

describe('admin-jobs utilities', () => {
	describe('formatJobDuration', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('returns "-" when startedAt is undefined', () => {
			expect(formatJobDuration(undefined)).toBe('-');
		});

		it('returns "-" when startedAt is empty', () => {
			expect(formatJobDuration('')).toBe('-');
		});

		it('returns "-" when startedAt is invalid date', () => {
			expect(formatJobDuration('invalid-date')).toBe('-');
		});

		it('returns "-" when completedAt is invalid date', () => {
			expect(formatJobDuration('2024-01-15T11:00:00Z', 'invalid-date')).toBe('-');
		});

		it('returns milliseconds for duration < 1 second', () => {
			const start = '2024-01-15T11:59:59.500Z';
			const end = '2024-01-15T11:59:59.800Z';
			expect(formatJobDuration(start, end)).toBe('300ms');
		});

		it('returns seconds for duration < 1 minute', () => {
			const start = '2024-01-15T11:59:30Z';
			const end = '2024-01-15T12:00:00Z';
			expect(formatJobDuration(start, end)).toBe('30s');
		});

		it('returns minutes for duration < 1 hour', () => {
			const start = '2024-01-15T11:30:00Z';
			const end = '2024-01-15T12:00:00Z';
			expect(formatJobDuration(start, end)).toBe('30m');
		});

		it('returns hours for duration >= 1 hour', () => {
			const start = '2024-01-15T10:00:00Z';
			const end = '2024-01-15T12:00:00Z';
			expect(formatJobDuration(start, end)).toBe('2h');
		});

		it('uses current time when completedAt is not provided', () => {
			const start = '2024-01-15T11:00:00Z';
			// Current time is 12:00:00, so 1 hour
			expect(formatJobDuration(start)).toBe('1h');
		});

		it('handles clock skew by clamping negative duration to 0', () => {
			// Start time is in the future (clock skew scenario)
			const start = '2024-01-15T12:30:00Z';
			const end = '2024-01-15T12:00:00Z';
			expect(formatJobDuration(start, end)).toBe('0ms');
		});
	});

	describe('getJobStatusColor', () => {
		it('returns gray for pending status', () => {
			expect(getJobStatusColor('pending')).toBe('#6b7280');
		});

		it('returns blue for running status', () => {
			expect(getJobStatusColor('running')).toBe('#3b82f6');
		});

		it('returns green for completed status', () => {
			expect(getJobStatusColor('completed')).toBe('#22c55e');
		});

		it('returns red for failed status', () => {
			expect(getJobStatusColor('failed')).toBe('#ef4444');
		});

		it('returns gray for cancelled status', () => {
			expect(getJobStatusColor('cancelled')).toBe('#9ca3af');
		});

		it('returns default gray for unknown status', () => {
			// @ts-expect-error - testing unknown status
			expect(getJobStatusColor('unknown')).toBe('#6b7280');
		});
	});

	describe('getJobTypeDisplayName', () => {
		it('returns correct display name for users_import', () => {
			expect(getJobTypeDisplayName('users_import')).toBe('User Import');
		});

		it('returns correct display name for users_bulk_update', () => {
			expect(getJobTypeDisplayName('users_bulk_update')).toBe('Bulk User Update');
		});

		it('returns correct display name for report_generation', () => {
			expect(getJobTypeDisplayName('report_generation')).toBe('Report Generation');
		});

		it('returns correct display name for org_bulk_members', () => {
			expect(getJobTypeDisplayName('org_bulk_members')).toBe('Organization Bulk Members');
		});

		it('returns fallback for unknown type', () => {
			// @ts-expect-error - testing unknown type
			expect(getJobTypeDisplayName('unknown_type')).toBe('Unknown Job Type');
		});
	});

	describe('getReportTypeDisplayName', () => {
		it('returns correct display name for user_activity', () => {
			expect(getReportTypeDisplayName('user_activity')).toBe('User Activity Report');
		});

		it('returns correct display name for access_summary', () => {
			expect(getReportTypeDisplayName('access_summary')).toBe('Access Summary Report');
		});

		it('returns correct display name for compliance_audit', () => {
			expect(getReportTypeDisplayName('compliance_audit')).toBe('Compliance Audit Report');
		});

		it('returns correct display name for security_events', () => {
			expect(getReportTypeDisplayName('security_events')).toBe('Security Events Report');
		});

		it('returns fallback for unknown type', () => {
			// @ts-expect-error - testing unknown type
			expect(getReportTypeDisplayName('unknown_report')).toBe('Unknown Report Type');
		});
	});
});
