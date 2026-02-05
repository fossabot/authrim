<script lang="ts">
	import { externalIdpAPI } from '$lib/api/client';
	import { onMount } from 'svelte';

	let testResult = '';
	let loading = false;

	async function testPKCEGeneration() {
		loading = true;
		testResult = 'Testing PKCE generation...\n\n';

		try {
			// Test startLogin API
			const result = await externalIdpAPI.startLogin('yahooj');

			testResult += '✅ PKCE Generation Success!\n\n';
			testResult += `Generated URL:\n${result.url}\n\n`;
			testResult += `code_verifier (${result.codeVerifier.length} chars):\n${result.codeVerifier}\n\n`;

			// Parse URL to check parameters
			const url = new URL(result.url);
			const params = url.searchParams;

			testResult += 'URL Parameters:\n';
			testResult += `- client_id: ${params.get('client_id')}\n`;
			testResult += `- code_challenge: ${params.get('code_challenge')}\n`;
			testResult += `- code_challenge_method: ${params.get('code_challenge_method')}\n`;

			if (!params.get('code_challenge')) {
				testResult += '\n❌ ERROR: code_challenge is missing!\n';
			} else if (!params.get('code_challenge_method')) {
				testResult += '\n❌ ERROR: code_challenge_method is missing!\n';
			} else {
				testResult += '\n✅ All PKCE parameters are present!\n';
			}
		} catch (error) {
			testResult += `\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`;
			console.error('PKCE test error:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Auto-run test on page load
		testPKCEGeneration();
	});
</script>

<svelte:head>
	<title>PKCE Test - Authrim</title>
</svelte:head>

<div class="container">
	<h1>PKCE Implementation Test</h1>

	<div class="card">
		<button on:click={testPKCEGeneration} disabled={loading}>
			{loading ? 'Testing...' : 'Run Test'}
		</button>

		<pre class="result">{testResult || 'Click "Run Test" to start...'}</pre>
	</div>

	<div class="info">
		<h2>Expected Behavior:</h2>
		<ul>
			<li>✅ code_verifier: 43 character Base64URL string</li>
			<li>✅ code_challenge: 43 character Base64URL string (SHA-256 hash)</li>
			<li>✅ code_challenge_method: S256</li>
			<li>
				✅ URL should include: <code
					>?client_id=login-ui&code_challenge=...&code_challenge_method=S256</code
				>
			</li>
		</ul>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 1rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #333;
		margin-bottom: 1.5rem;
	}

	h2 {
		color: #555;
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
	}

	.card {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	button {
		background: #0066cc;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	button:hover:not(:disabled) {
		background: #0052a3;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.result {
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 1rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-wrap: break-word;
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.9rem;
		line-height: 1.5;
		min-height: 200px;
	}

	.info {
		background: #f8f9fa;
		border-left: 4px solid #0066cc;
		padding: 1rem 1.5rem;
		border-radius: 4px;
	}

	ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	li {
		margin: 0.5rem 0;
	}

	code {
		background: #e9ecef;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.85rem;
	}
</style>
