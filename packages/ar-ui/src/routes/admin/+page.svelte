<script lang="ts">
	import { adminAuth } from '$lib/stores/admin-auth.svelte';
</script>

<svelte:head>
	<title>Admin Dashboard - Authrim</title>
</svelte:head>

<div style="max-width: 600px; margin: 40px auto; text-align: center;">
	<h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 16px;">
		Admin Dashboard
	</h1>

	<div style="background-color: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
		<p style="color: #059669; font-size: 18px; margin-bottom: 16px;">
			You are logged in as an administrator.
		</p>

		{#if adminAuth.user}
			<div style="color: #6b7280; font-size: 14px;">
				<p><strong>Email:</strong> {adminAuth.user.email || 'N/A'}</p>
				{#if adminAuth.user.name}
					<p><strong>Name:</strong> {adminAuth.user.name}</p>
				{/if}
			</div>
		{/if}
	</div>

	<p style="margin-top: 24px; color: #9ca3af; font-size: 14px;">
		Phase 1: Authentication only. More features coming soon.
	</p>
</div>
