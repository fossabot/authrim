<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/admin/diagnostic-logging');
	});
</script>

<svelte:head>
	<title>Diagnostic Logging - Redirecting</title>
</svelte:head>

<div class="container">
	<div class="card">
		<h1>Diagnostic Logs Export moved</h1>
		<p>Use the Diagnostic Logging page to configure and export diagnostic logs.</p>
		<a class="btn btn-primary" href="/admin/diagnostic-logging"> Go to Diagnostic Logging </a>
	</div>
</div>
