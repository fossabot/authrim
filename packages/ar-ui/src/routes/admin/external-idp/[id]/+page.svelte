<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		adminExternalProvidersAPI,
		type ExternalIdPProvider,
		type UpdateProviderRequest
	} from '$lib/api/admin-external-providers';

	let provider: ExternalIdPProvider | null = $state(null);
	let loading = $state(true);
	let error = $state('');
	let saving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state(false);

	// Form state
	let name = $state('');
	let slug = $state('');
	let providerType = $state<'oidc' | 'oauth2'>('oidc');
	let enabled = $state(true);
	let priority = $state(0);
	let clientId = $state('');
	let clientSecret = $state(''); // Only used for updates
	let issuer = $state('');
	let scopes = $state('');
	let authorizationEndpoint = $state('');
	let tokenEndpoint = $state('');
	let userinfoEndpoint = $state('');
	let jwksUri = $state('');
	let autoLinkEmail = $state(true);
	let jitProvisioning = $state(true);
	let requireEmailVerified = $state(true);
	let alwaysFetchUserinfo = $state(false);
	let iconUrl = $state('');
	let buttonColor = $state('');
	let buttonText = $state('');

	const providerId = $derived($page.params.id);

	async function loadProvider() {
		if (!providerId) return;

		loading = true;
		error = '';

		try {
			const data = await adminExternalProvidersAPI.get(providerId);
			provider = data;

			// Populate form
			name = data.name;
			slug = data.slug || '';
			providerType = data.providerType;
			enabled = data.enabled;
			priority = data.priority;
			clientId = data.clientId;
			issuer = data.issuer || '';
			scopes = data.scopes;
			authorizationEndpoint = data.authorizationEndpoint || '';
			tokenEndpoint = data.tokenEndpoint || '';
			userinfoEndpoint = data.userinfoEndpoint || '';
			jwksUri = data.jwksUri || '';
			autoLinkEmail = data.autoLinkEmail;
			jitProvisioning = data.jitProvisioning;
			requireEmailVerified = data.requireEmailVerified;
			alwaysFetchUserinfo = data.alwaysFetchUserinfo || false;
			iconUrl = data.iconUrl || '';
			buttonColor = data.buttonColor || '';
			buttonText = data.buttonText || '';
		} catch (err) {
			console.error('Failed to load provider:', err);
			error = err instanceof Error ? err.message : 'Failed to load provider';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadProvider();
	});

	async function handleSubmit() {
		if (!providerId) return;

		saving = true;
		saveError = '';
		saveSuccess = false;

		try {
			const updateData: UpdateProviderRequest = {
				name,
				slug: slug || undefined,
				provider_type: providerType,
				enabled,
				priority,
				client_id: clientId,
				issuer: issuer || undefined,
				scopes: scopes || undefined,
				authorization_endpoint: authorizationEndpoint || undefined,
				token_endpoint: tokenEndpoint || undefined,
				userinfo_endpoint: userinfoEndpoint || undefined,
				jwks_uri: jwksUri || undefined,
				auto_link_email: autoLinkEmail,
				jit_provisioning: jitProvisioning,
				require_email_verified: requireEmailVerified,
				always_fetch_userinfo: alwaysFetchUserinfo,
				icon_url: iconUrl || undefined,
				button_color: buttonColor || undefined,
				button_text: buttonText || undefined
			};

			// Only include client_secret if it was entered
			if (clientSecret) {
				updateData.client_secret = clientSecret;
			}

			await adminExternalProvidersAPI.update(providerId, updateData);
			saveSuccess = true;
			clientSecret = ''; // Clear secret field after save

			// Reload to get updated data
			await loadProvider();
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to update provider';
		} finally {
			saving = false;
		}
	}

	function navigateBack() {
		goto('/admin/external-idp');
	}
</script>

<div>
	<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
		<button
			onclick={navigateBack}
			style="
				padding: 8px 12px;
				background-color: #f3f4f6;
				color: #374151;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
			"
		>
			&larr; Back
		</button>
		<h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">
			{loading ? 'Loading...' : provider ? `Edit: ${provider.name}` : 'Provider Not Found'}
		</h1>
	</div>

	{#if error}
		<div
			style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
		>
			{error}
		</div>
	{/if}

	{#if loading}
		<div style="text-align: center; padding: 48px; color: #6b7280;">Loading...</div>
	{:else if provider}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			{#if saveError}
				<div
					style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
				>
					{saveError}
				</div>
			{/if}

			{#if saveSuccess}
				<div
					style="padding: 12px 16px; background-color: #d1fae5; color: #065f46; border-radius: 6px; margin-bottom: 16px;"
				>
					Provider updated successfully!
				</div>
			{/if}

			<!-- Basic Information -->
			<div
				style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;"
			>
				<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
					Basic Information
				</h2>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
					<div>
						<label
							for="name"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Name *
						</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							required
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>

					<div>
						<label
							for="slug"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Slug (optional)
						</label>
						<input
							id="slug"
							type="text"
							bind:value={slug}
							placeholder="e.g., google"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>

					<div>
						<label
							for="providerType"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Provider Type
						</label>
						<select
							id="providerType"
							bind:value={providerType}
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						>
							<option value="oidc">OIDC (OpenID Connect)</option>
							<option value="oauth2">OAuth 2.0</option>
						</select>
					</div>

					<div>
						<label
							for="priority"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Priority
						</label>
						<input
							id="priority"
							type="number"
							bind:value={priority}
							min="0"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
						<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
							Higher priority providers are shown first
						</p>
					</div>
				</div>

				<div style="margin-top: 16px;">
					<label
						style="display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; color: #374151;"
					>
						<input type="checkbox" bind:checked={enabled} />
						<span>Enabled</span>
					</label>
				</div>
			</div>

			<!-- OAuth/OIDC Configuration -->
			<div
				style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;"
			>
				<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
					OAuth/OIDC Configuration
				</h2>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
					<div>
						<label
							for="clientId"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Client ID *
						</label>
						<input
							id="clientId"
							type="text"
							bind:value={clientId}
							required
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>

					<div>
						<label
							for="clientSecret"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Client Secret (leave empty to keep current)
						</label>
						<input
							id="clientSecret"
							type="password"
							bind:value={clientSecret}
							placeholder="Enter new secret to update"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
						{#if provider.hasSecret}
							<p style="font-size: 12px; color: #065f46; margin: 4px 0 0 0;">
								A secret is already configured
							</p>
						{/if}
					</div>

					{#if providerType === 'oidc'}
						<div style="grid-column: 1 / -1;">
							<label
								for="issuer"
								style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
							>
								Issuer URL
							</label>
							<input
								id="issuer"
								type="url"
								bind:value={issuer}
								placeholder="https://accounts.google.com"
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>
					{/if}

					<div style="grid-column: 1 / -1;">
						<label
							for="scopes"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Scopes
						</label>
						<input
							id="scopes"
							type="text"
							bind:value={scopes}
							placeholder="openid email profile"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>
				</div>

				<details style="margin-top: 16px;">
					<summary style="cursor: pointer; font-size: 14px; color: #3b82f6;">
						Advanced Endpoints
					</summary>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
						<div>
							<label
								for="authorizationEndpoint"
								style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
							>
								Authorization Endpoint
							</label>
							<input
								id="authorizationEndpoint"
								type="url"
								bind:value={authorizationEndpoint}
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>

						<div>
							<label
								for="tokenEndpoint"
								style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
							>
								Token Endpoint
							</label>
							<input
								id="tokenEndpoint"
								type="url"
								bind:value={tokenEndpoint}
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>

						<div>
							<label
								for="userinfoEndpoint"
								style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
							>
								Userinfo Endpoint
							</label>
							<input
								id="userinfoEndpoint"
								type="url"
								bind:value={userinfoEndpoint}
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>

						<div>
							<label
								for="jwksUri"
								style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
							>
								JWKS URI
							</label>
							<input
								id="jwksUri"
								type="url"
								bind:value={jwksUri}
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>
					</div>
				</details>
			</div>

			<!-- Behavior Settings -->
			<div
				style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;"
			>
				<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
					Behavior Settings
				</h2>

				<div style="display: flex; flex-direction: column; gap: 12px;">
					<label
						style="display: flex; align-items: flex-start; gap: 8px; font-size: 14px; cursor: pointer; color: #374151;"
					>
						<input type="checkbox" bind:checked={autoLinkEmail} style="margin-top: 2px;" />
						<div>
							<strong style="color: #1f2937;">Auto Link Email</strong>
							<p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">
								Automatically link accounts with matching email addresses
							</p>
						</div>
					</label>

					<label
						style="display: flex; align-items: flex-start; gap: 8px; font-size: 14px; cursor: pointer; color: #374151;"
					>
						<input type="checkbox" bind:checked={jitProvisioning} style="margin-top: 2px;" />
						<div>
							<strong style="color: #1f2937;">JIT Provisioning</strong>
							<p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">
								Create new user accounts on first login
							</p>
						</div>
					</label>

					<label
						style="display: flex; align-items: flex-start; gap: 8px; font-size: 14px; cursor: pointer; color: #374151;"
					>
						<input type="checkbox" bind:checked={requireEmailVerified} style="margin-top: 2px;" />
						<div>
							<strong style="color: #1f2937;">Require Email Verified</strong>
							<p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">
								Only allow users with verified email addresses
							</p>
						</div>
					</label>

					<label
						style="display: flex; align-items: flex-start; gap: 8px; font-size: 14px; cursor: pointer; color: #374151;"
					>
						<input type="checkbox" bind:checked={alwaysFetchUserinfo} style="margin-top: 2px;" />
						<div>
							<strong style="color: #1f2937;">Always Fetch Userinfo</strong>
							<p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">
								Fetch userinfo endpoint even if claims are in ID token
							</p>
						</div>
					</label>
				</div>
			</div>

			<!-- UI Customization -->
			<div
				style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;"
			>
				<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
					UI Customization
				</h2>

				<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
					<div>
						<label
							for="iconUrl"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Icon URL
						</label>
						<input
							id="iconUrl"
							type="url"
							bind:value={iconUrl}
							placeholder="https://..."
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>

					<div>
						<label
							for="buttonColor"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Button Color
						</label>
						<input
							id="buttonColor"
							type="text"
							bind:value={buttonColor}
							placeholder="#4285F4"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>

					<div>
						<label
							for="buttonText"
							style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
						>
							Button Text
						</label>
						<input
							id="buttonText"
							type="text"
							bind:value={buttonText}
							placeholder="Sign in with Google"
							style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
						/>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div style="display: flex; justify-content: flex-end; gap: 12px;">
				<button
					type="button"
					onclick={navigateBack}
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
					type="submit"
					disabled={saving}
					style="
						padding: 10px 20px;
						background-color: #3b82f6;
						color: white;
						border: none;
						border-radius: 6px;
						cursor: pointer;
						font-size: 14px;
						opacity: {saving ? 0.7 : 1};
					"
				>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</form>
	{:else}
		<div
			style="text-align: center; padding: 48px; color: #6b7280; background: white; border-radius: 8px; border: 1px solid #e5e7eb;"
		>
			<p style="margin: 0 0 16px 0;">Provider not found.</p>
			<button
				onclick={navigateBack}
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
				Back to Providers
			</button>
		</div>
	{/if}
</div>
