/**
 * Redirect /admin/admin-roles to /admin/admin-rbac
 *
 * This page has been moved to the new Admin Access Control Hub structure.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// 301 permanent redirect
	throw redirect(301, '/admin/admin-rbac');
};
