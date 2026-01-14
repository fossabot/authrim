<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminSigningKeysAPI,
		type SigningKeysStatus,
		type KeyStatus
	} from '$lib/api/admin-signing-keys';

	// State
	let keysStatus = $state<SigningKeysStatus | null>(null);
	let loading = $state(true);
	let error = $state('');
	let successMessage = $state('');

	// Rotation state
	let rotating = $state(false);
	let showEmergencyDialog = $state(false);
	let emergencyReason = $state('');
	let emergencyError = $state('');

	// Confirmation dialog for normal rotation
	let showNormalRotationDialog = $state(false);

	// Load data on mount
	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = '';

		try {
			keysStatus = await adminSigningKeysAPI.getStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load signing keys status';
		} finally {
			loading = false;
		}
	}

	// Normal rotation
	async function performNormalRotation() {
		rotating = true;
		error = '';
		successMessage = '';

		try {
			const result = await adminSigningKeysAPI.rotate();
			successMessage = result.message;
			showNormalRotationDialog = false;

			// Reload data
			await loadData();

			// Clear success message after 5 seconds
			setTimeout(() => {
				successMessage = '';
			}, 5000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to rotate signing keys';
		} finally {
			rotating = false;
		}
	}

	// Emergency rotation
	async function performEmergencyRotation() {
		if (emergencyReason.trim().length < 10) {
			emergencyError = 'Reason must be at least 10 characters';
			return;
		}

		rotating = true;
		emergencyError = '';
		error = '';
		successMessage = '';

		try {
			const result = await adminSigningKeysAPI.emergencyRotate(emergencyReason);
			successMessage = result.message;
			showEmergencyDialog = false;
			emergencyReason = '';

			// Reload data
			await loadData();

			// Clear success message after 5 seconds
			setTimeout(() => {
				successMessage = '';
			}, 5000);
		} catch (err) {
			emergencyError = err instanceof Error ? err.message : 'Failed to perform emergency rotation';
		} finally {
			rotating = false;
		}
	}

	// Get status badge style
	function getStatusBadge(status: KeyStatus): { text: string; bg: string; color: string } {
		switch (status) {
			case 'active':
				return { text: 'Active', bg: '#d1fae5', color: '#065f46' };
			case 'overlap':
				return { text: 'Overlap', bg: '#fef3c7', color: '#92400e' };
			case 'revoked':
				return { text: 'Revoked', bg: '#fee2e2', color: '#991b1b' };
			default:
				return { text: status, bg: '#f3f4f6', color: '#6b7280' };
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<div>
	<!-- Back link and header -->
	<div style="margin-bottom: 24px;">
		<a
			href="/admin/settings"
			style="color: #3b82f6; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;"
		>
			← Back to Settings
		</a>
		<h1 style="font-size: 24px; font-weight: bold; color: #111827; margin: 8px 0 4px 0;">
			Signing Keys
		</h1>
		<p style="color: #6b7280; margin: 0;">
			Manage JWT signing keys for token issuance and rotation
		</p>
	</div>

	<!-- Error message -->
	{#if error}
		<div
			style="background-color: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 12px; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	<!-- Success message -->
	{#if successMessage}
		<div
			style="background-color: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 12px; border-radius: 6px; margin-bottom: 16px;"
		>
			{successMessage}
		</div>
	{/if}

	{#if loading}
		<div style="display: flex; justify-content: center; padding: 48px;">
			<p style="color: #6b7280;">Loading signing keys status...</p>
		</div>
	{:else if keysStatus}
		{@const activeKey = keysStatus.keys.find((k) => k.kid === keysStatus!.activeKeyId)}
		<!-- Current Active Key -->
		<div
			style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;"
		>
			<h2 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
				Current Active Key
			</h2>
			{#if activeKey}
				{@const badge = getStatusBadge(activeKey.status)}
				<div
					style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;"
				>
					<div>
						<p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">Key ID</p>
						<p style="font-size: 14px; font-family: monospace; color: #111827; margin: 0;">
							{activeKey.kid}
						</p>
					</div>
					<div>
						<p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">Algorithm</p>
						<p style="font-size: 14px; color: #111827; margin: 0;">
							{activeKey.algorithm}
						</p>
					</div>
					<div>
						<p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">Created</p>
						<p style="font-size: 14px; color: #111827; margin: 0;">
							{formatDate(activeKey.createdAt)}
						</p>
					</div>
					<div>
						<p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">Status</p>
						<span
							style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background-color: {badge.bg}; color: {badge.color};"
						>
							● {badge.text}
						</span>
					</div>
				</div>
			{:else}
				<p style="color: #6b7280;">No active key found</p>
			{/if}
		</div>

		<!-- Key Rotation -->
		<div
			style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;"
		>
			<h2 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
				Key Rotation
			</h2>

			<div
				style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;"
			>
				<!-- Normal Rotation -->
				<div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
					<h3 style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">
						Normal Rotation
					</h3>
					<p style="font-size: 13px; color: #6b7280; margin: 0 0 12px 0;">
						Creates a new signing key. The old key remains valid for 24 hours to allow existing
						tokens to be verified.
					</p>
					<button
						onclick={() => (showNormalRotationDialog = true)}
						disabled={rotating}
						style="
							padding: 8px 16px;
							background-color: #3b82f6;
							color: white;
							border: none;
							border-radius: 6px;
							font-size: 14px;
							cursor: {rotating ? 'not-allowed' : 'pointer'};
							opacity: {rotating ? 0.7 : 1};
						"
					>
						Rotate Key
					</button>
				</div>

				<!-- Emergency Rotation -->
				<div
					style="padding: 16px; border: 1px solid #fca5a5; border-radius: 8px; background-color: #fef2f2;"
				>
					<h3 style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 8px 0;">
						⚠️ Emergency Rotation
					</h3>
					<p style="font-size: 13px; color: #7f1d1d; margin: 0 0 12px 0;">
						Immediately revokes the current key. All existing tokens will become invalid. Use only
						in case of key compromise.
					</p>
					<button
						onclick={() => (showEmergencyDialog = true)}
						disabled={rotating}
						style="
							padding: 8px 16px;
							background-color: #dc2626;
							color: white;
							border: none;
							border-radius: 6px;
							font-size: 14px;
							cursor: {rotating ? 'not-allowed' : 'pointer'};
							opacity: {rotating ? 0.7 : 1};
						"
					>
						Emergency Rotate
					</button>
				</div>
			</div>
		</div>

		<!-- Key History -->
		<div
			style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;"
		>
			<h2 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
				Key History
			</h2>
			{#if keysStatus.keys.length > 0}
				<div style="overflow-x: auto;">
					<table style="width: 100%; border-collapse: collapse;">
						<thead>
							<tr style="background-color: #f9fafb;">
								<th
									style="text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;"
								>
									Key ID
								</th>
								<th
									style="text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;"
								>
									Algorithm
								</th>
								<th
									style="text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;"
								>
									Status
								</th>
								<th
									style="text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;"
								>
									Created
								</th>
								<th
									style="text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;"
								>
									Revoked
								</th>
							</tr>
						</thead>
						<tbody>
							{#each keysStatus.keys as key (key.kid)}
								{@const badge = getStatusBadge(key.status)}
								<tr style="border-bottom: 1px solid #e5e7eb;">
									<td
										style="padding: 12px 16px; font-size: 14px; font-family: monospace; color: #374151;"
									>
										{key.kid.length > 20 ? key.kid.slice(0, 20) + '...' : key.kid}
									</td>
									<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
										{key.algorithm}
									</td>
									<td style="padding: 12px 16px;">
										<span
											style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background-color: {badge.bg}; color: {badge.color};"
										>
											{badge.text}
										</span>
									</td>
									<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
										{formatDate(key.createdAt)}
									</td>
									<td style="padding: 12px 16px; font-size: 14px; color: #374151;">
										{key.revokedAt ? formatDate(key.revokedAt) : '-'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p style="color: #6b7280;">No key history available</p>
			{/if}
		</div>
	{/if}
</div>

<!-- Normal Rotation Confirmation Dialog -->
{#if showNormalRotationDialog}
	<div
		style="
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		"
		onclick={() => (showNormalRotationDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showNormalRotationDialog = false)}
		role="button"
		tabindex="0"
	>
		<div
			style="
				background-color: white;
				border-radius: 8px;
				padding: 24px;
				max-width: 400px;
				width: 90%;
			"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">
				Confirm Key Rotation
			</h3>
			<p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
				This will create a new signing key. The current key will remain valid for 24 hours to allow
				existing tokens to be verified.
			</p>
			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={() => (showNormalRotationDialog = false)}
					disabled={rotating}
					style="
						padding: 10px 20px;
						background-color: white;
						color: #374151;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						cursor: pointer;
					"
				>
					Cancel
				</button>
				<button
					onclick={performNormalRotation}
					disabled={rotating}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						font-size: 14px;
						cursor: {rotating ? 'not-allowed' : 'pointer'};
						opacity: {rotating ? 0.7 : 1};
					"
				>
					{rotating ? 'Rotating...' : 'Confirm Rotation'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Emergency Rotation Dialog -->
{#if showEmergencyDialog}
	<div
		style="
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		"
		onclick={() => {
			showEmergencyDialog = false;
			emergencyReason = '';
			emergencyError = '';
		}}
		onkeydown={(e) => e.key === 'Escape' && (showEmergencyDialog = false)}
		role="button"
		tabindex="0"
	>
		<div
			style="
				background-color: white;
				border-radius: 8px;
				padding: 24px;
				max-width: 500px;
				width: 90%;
			"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<h3 style="font-size: 18px; font-weight: 600; color: #dc2626; margin: 0 0 12px 0;">
				⚠️ Emergency Key Rotation
			</h3>
			<div
				style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin-bottom: 16px;"
			>
				<p style="font-size: 13px; color: #7f1d1d; margin: 0;">
					<strong>Warning:</strong> This will immediately revoke the current signing key. All existing
					tokens will become invalid. JWKS cache on edge nodes may take up to 60 seconds to refresh.
				</p>
			</div>
			<div style="margin-bottom: 16px;">
				<label
					for="emergency-reason"
					style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;"
				>
					Reason for emergency rotation (required)
				</label>
				<textarea
					id="emergency-reason"
					bind:value={emergencyReason}
					placeholder="Describe the reason for emergency rotation (min 10 characters)..."
					style="
						width: 100%;
						height: 80px;
						padding: 10px 12px;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						resize: vertical;
					"
				></textarea>
				<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
					{emergencyReason.trim().length}/10 characters minimum
				</p>
			</div>
			{#if emergencyError}
				<div
					style="background-color: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;"
				>
					{emergencyError}
				</div>
			{/if}
			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					onclick={() => {
						showEmergencyDialog = false;
						emergencyReason = '';
						emergencyError = '';
					}}
					disabled={rotating}
					style="
						padding: 10px 20px;
						background-color: white;
						color: #374151;
						border: 1px solid #d1d5db;
						border-radius: 6px;
						font-size: 14px;
						cursor: pointer;
					"
				>
					Cancel
				</button>
				<button
					onclick={performEmergencyRotation}
					disabled={rotating || emergencyReason.trim().length < 10}
					style="
						padding: 10px 20px;
						background-color: #dc2626;
						color: white;
						border: none;
						border-radius: 6px;
						font-size: 14px;
						cursor: {rotating || emergencyReason.trim().length < 10 ? 'not-allowed' : 'pointer'};
						opacity: {rotating || emergencyReason.trim().length < 10 ? 0.7 : 1};
					"
				>
					{rotating ? 'Rotating...' : 'Emergency Rotate'}
				</button>
			</div>
		</div>
	</div>
{/if}
