<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminScimTokensAPI,
		type ScimToken,
		type CreateScimTokenResponse
	} from '$lib/api/admin-scim-tokens';

	let tokens: ScimToken[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Create token dialog state
	let showCreateDialog = $state(false);
	let creating = $state(false);
	let createError = $state('');
	let newTokenDescription = $state('');
	let newTokenExpiresInDays = $state(365);

	// Token created success dialog state
	let showTokenCreatedDialog = $state(false);
	let createdToken: CreateScimTokenResponse | null = $state(null);
	let tokenCopied = $state(false);

	// Revoke confirmation dialog state
	let showRevokeDialog = $state(false);
	let tokenToRevoke: ScimToken | null = $state(null);
	let revoking = $state(false);
	let revokeError = $state('');

	async function loadTokens() {
		loading = true;
		error = '';

		try {
			const response = await adminScimTokensAPI.list();
			tokens = response.tokens;
		} catch (err) {
			console.error('Failed to load SCIM tokens:', err);
			error = 'Failed to load SCIM tokens';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadTokens();
	});

	function openCreateDialog() {
		newTokenDescription = '';
		newTokenExpiresInDays = 365;
		createError = '';
		showCreateDialog = true;
	}

	function closeCreateDialog() {
		showCreateDialog = false;
		newTokenDescription = '';
		createError = '';
	}

	async function confirmCreate() {
		creating = true;
		createError = '';

		try {
			const result = await adminScimTokensAPI.create({
				description: newTokenDescription || undefined,
				expiresInDays: newTokenExpiresInDays
			});

			createdToken = result;
			showCreateDialog = false;
			tokenCopied = false;
			showTokenCreatedDialog = true;
			await loadTokens();
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create token';
		} finally {
			creating = false;
		}
	}

	function closeTokenCreatedDialog() {
		showTokenCreatedDialog = false;
		createdToken = null;
		tokenCopied = false;
	}

	async function copyTokenToClipboard() {
		if (!createdToken) return;

		try {
			await navigator.clipboard.writeText(createdToken.token);
			tokenCopied = true;
		} catch (err) {
			console.error('Failed to copy token:', err);
		}
	}

	function openRevokeDialog(token: ScimToken) {
		tokenToRevoke = token;
		revokeError = '';
		showRevokeDialog = true;
	}

	function closeRevokeDialog() {
		showRevokeDialog = false;
		tokenToRevoke = null;
		revokeError = '';
	}

	async function confirmRevoke() {
		if (!tokenToRevoke) return;

		revoking = true;
		revokeError = '';

		try {
			await adminScimTokensAPI.revoke(tokenToRevoke.tokenHash);
			showRevokeDialog = false;
			tokenToRevoke = null;
			await loadTokens();
		} catch (err) {
			revokeError = err instanceof Error ? err.message : 'Failed to revoke token';
		} finally {
			revoking = false;
		}
	}

	function formatTokenHash(hash: string): string {
		return hash.slice(0, 8) + '...';
	}
</script>

<div>
	<div
		style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;"
	>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">SCIM Tokens</h1>
		<button
			onclick={openCreateDialog}
			style="
				padding: 10px 20px;
				background-color: #3b82f6;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
			"
		>
			Create Token
		</button>
	</div>

	<p style="color: #6b7280; margin-bottom: 24px;">
		SCIM tokens are used for System for Cross-domain Identity Management (RFC 7643/7644)
		provisioning.
	</p>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading...</div>
	{:else if tokens.length === 0}
		<div
			style="text-align: center; padding: 48px; color: #6b7280; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0;">No SCIM tokens found.</p>
			<p style="margin: 0; font-size: 14px;">
				Create a token to enable SCIM provisioning for your identity provider.
			</p>
		</div>
	{:else}
		<div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
			<table style="width: 100%; border-collapse: collapse;">
				<thead>
					<tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Token Hash
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Description
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Expires In (Days)
						</th>
						<th
							style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Status
						</th>
						<th
							style="text-align: right; padding: 12px 16px; font-weight: 600; font-size: 14px; color: #374151;"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{#each tokens as token (token.tokenHash)}
						<tr style="border-bottom: 1px solid #e5e7eb;">
							<td
								style="padding: 12px 16px; font-size: 14px; font-family: monospace; color: #374151;"
							>
								{formatTokenHash(token.tokenHash)}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								{token.description || '-'}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								{token.expiresInDays}
							</td>
							<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
								<span
									style="
										display: inline-block;
										padding: 4px 8px;
										border-radius: 9999px;
										font-size: 12px;
										font-weight: 500;
										background-color: {token.enabled ? '#d1fae5' : '#fee2e2'};
										color: {token.enabled ? '#065f46' : '#991b1b'};
									"
								>
									{token.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</td>
							<td style="padding: 12px 16px; text-align: right;">
								<button
									onclick={() => openRevokeDialog(token)}
									style="
										padding: 6px 12px;
										background-color: #fee2e2;
										color: #dc2626;
										border: none;
										border-radius: 4px;
										cursor: pointer;
										font-size: 13px;
									"
								>
									Revoke
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Create Token Dialog -->
{#if showCreateDialog}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeCreateDialog}
		onkeydown={(e) => e.key === 'Escape' && closeCreateDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;">
				Create SCIM Token
			</h2>

			{#if createError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{createError}
				</div>
			{/if}

			<div style="margin-bottom: 16px;">
				<label
					for="description"
					style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
				>
					Description (optional)
				</label>
				<input
					id="description"
					type="text"
					bind:value={newTokenDescription}
					placeholder="e.g., Okta SCIM Integration"
					style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
				/>
			</div>

			<div style="margin-bottom: 24px;">
				<label
					for="expiresInDays"
					style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
				>
					Expires In (Days)
				</label>
				<input
					id="expiresInDays"
					type="number"
					min="1"
					max="3650"
					bind:value={newTokenExpiresInDays}
					style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
				/>
				<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
					Valid range: 1-3650 days (up to 10 years)
				</p>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeCreateDialog}
					disabled={creating}
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
					onclick={confirmCreate}
					disabled={creating}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {creating ? 0.7 : 1};
					"
				>
					{creating ? 'Creating...' : 'Create Token'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Token Created Success Dialog -->
{#if showTokenCreatedDialog && createdToken}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #065f46;">
				Token Created Successfully
			</h2>

			<div
				style="padding: 12px 16px; background-color: #fef3c7; color: #92400e; border-radius: 6px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"
			>
				<span style="font-size: 18px;">&#9888;</span>
				<span style="font-size: 14px;">Save this token now - it will not be shown again!</span>
			</div>

			<div style="margin-bottom: 16px;">
				<label
					style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
				>
					SCIM Token
				</label>
				<div
					style="display: flex; gap: 8px; align-items: stretch; background-color: #f3f4f6; border-radius: 6px; padding: 8px;"
				>
					<code
						style="flex: 1; font-size: 12px; word-break: break-all; padding: 8px; background-color: white; border-radius: 4px; border: 1px solid #e5e7eb; color: #1f2937;"
					>
						{createdToken.token}
					</code>
					<button
						onclick={copyTokenToClipboard}
						style="
							padding: 8px 16px;
							background-color: {tokenCopied ? '#d1fae5' : '#3b82f6'};
							color: {tokenCopied ? '#065f46' : 'white'};
							border: none;
							border-radius: 4px;
							cursor: pointer;
							font-size: 14px;
							white-space: nowrap;
						"
					>
						{tokenCopied ? 'Copied!' : 'Copy'}
					</button>
				</div>
			</div>

			<div style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
				<p style="margin: 0 0 8px 0;">
					<strong>Description:</strong>
					{createdToken.description || 'None'}
				</p>
				<p style="margin: 0;">
					<strong>Expires In:</strong>
					{createdToken.expiresInDays} days
				</p>
			</div>

			<div style="display: flex; justify-content: flex-end;">
				<button
					onclick={closeTokenCreatedDialog}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
					"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Revoke Confirmation Dialog -->
{#if showRevokeDialog && tokenToRevoke}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;"
		onclick={closeRevokeDialog}
		onkeydown={(e) => e.key === 'Escape' && closeRevokeDialog()}
		tabindex="-1"
		role="dialog"
	>
		<div
			style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px 0; color: #1f2937;">
				Revoke SCIM Token
			</h2>

			{#if revokeError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{revokeError}
				</div>
			{/if}

			<p style="color: #6b7280; margin: 0 0 16px 0;">
				Are you sure you want to revoke this SCIM token? This action cannot be undone and will
				immediately disable any SCIM integrations using this token.
			</p>

			<div
				style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 24px;"
			>
				<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
					<strong>Token Hash:</strong>
					<code style="color: #1f2937;">{formatTokenHash(tokenToRevoke.tokenHash)}</code>
				</p>
				<p style="margin: 0; font-size: 14px; color: #374151;">
					<strong>Description:</strong>
					{tokenToRevoke.description || 'None'}
				</p>
			</div>

			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={closeRevokeDialog}
					disabled={revoking}
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
					onclick={confirmRevoke}
					disabled={revoking}
					style="
						padding: 10px 20px;
						background-color: #dc2626;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {revoking ? 0.7 : 1};
					"
				>
					{revoking ? 'Revoking...' : 'Revoke Token'}
				</button>
			</div>
		</div>
	</div>
{/if}
