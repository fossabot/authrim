<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { adminAuth } from '$lib/stores/admin-auth.svelte';
	import { adminAuthAPI } from '$lib/api/admin-auth';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Check if current page is login page
	const isLoginPage = $derived($page.url.pathname === '/admin/login');

	onMount(async () => {
		// Skip auth check on login page
		if (isLoginPage) {
			adminAuth.setLoading(false);
			return;
		}

		// Check authentication status
		await adminAuth.checkAuth();

		// Redirect to login if not authenticated
		if (!adminAuth.isAuthenticated) {
			goto('/admin/login');
		}
	});

	async function handleLogout() {
		adminAuth.clearAuth();
		await adminAuthAPI.logout();
	}
</script>

{#if isLoginPage}
	<!-- Login page - no layout chrome -->
	{@render children()}
{:else if adminAuth.isLoading}
	<!-- Loading state -->
	<div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
		<p>Loading...</p>
	</div>
{:else if adminAuth.isAuthenticated}
	<!-- Authenticated - simple layout -->
	<div style="min-height: 100vh; background-color: #f9fafb;">
		<!-- Header -->
		<header style="background-color: #1f2937; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
			<h1 style="font-size: 20px; font-weight: bold; margin: 0;">Authrim Admin</h1>
			<div style="display: flex; align-items: center; gap: 16px;">
				<span style="font-size: 14px; color: #9ca3af;">{adminAuth.user?.email || 'Admin'}</span>
				<button
					onclick={handleLogout}
					style="
						padding: 8px 16px;
						background-color: #374151;
						color: #d1d5db;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 14px;
					"
				>
					Logout
				</button>
			</div>
		</header>

		<!-- Main content -->
		<main style="padding: 24px;">
			{@render children()}
		</main>
	</div>
{:else}
	<!-- Not authenticated - redirect happens in onMount -->
	<div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
		<p>Redirecting to login...</p>
	</div>
{/if}
