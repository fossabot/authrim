<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		adminExternalProvidersAPI,
		type CreateProviderRequest,
		type ProviderTemplate,
		PROVIDER_TEMPLATES
	} from '$lib/api/admin-external-providers';

	let saving = $state(false);
	let error = $state('');

	// Template selection
	let selectedTemplate = $state<ProviderTemplate | 'custom'>('custom');

	// Form state
	let name = $state('');
	let slug = $state('');
	let providerType = $state<'oidc' | 'oauth2'>('oidc');
	let enabled = $state(true);
	let priority = $state(0);
	let clientId = $state('');
	let clientSecret = $state('');
	let issuer = $state('');
	let scopes = $state('openid email profile');
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

	function handleTemplateChange() {
		const template = PROVIDER_TEMPLATES.find((t) => t.id === selectedTemplate);
		if (template) {
			name = template.name;
			slug = template.id;
			providerType = template.providerType;
			buttonText = `Sign in with ${template.name}`;

			// Set template-specific defaults
			switch (selectedTemplate) {
				case 'google':
					scopes = 'openid email profile';
					buttonColor = '#4285F4';
					break;
				case 'github':
					scopes = 'read:user user:email';
					buttonColor = '#24292E';
					break;
				case 'microsoft':
					scopes = 'openid email profile';
					buttonColor = '#00A4EF';
					break;
				case 'linkedin':
					scopes = 'openid email profile';
					buttonColor = '#0A66C2';
					break;
				case 'facebook':
					scopes = 'email public_profile';
					buttonColor = '#1877F2';
					break;
				case 'twitter':
					scopes = 'users.read tweet.read offline.access';
					buttonColor = '#1DA1F2';
					break;
				case 'apple':
					scopes = 'name email';
					buttonColor = '#000000';
					break;
			}
		} else {
			// Reset to defaults for custom
			name = '';
			slug = '';
			scopes = 'openid email profile';
			buttonColor = '';
			buttonText = '';
		}
	}

	async function handleSubmit() {
		saving = true;
		error = '';

		try {
			const createData: CreateProviderRequest = {
				name,
				slug: slug || undefined,
				provider_type: providerType,
				enabled,
				priority,
				client_id: clientId,
				client_secret: clientSecret,
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

			// Add template if using a predefined one
			if (selectedTemplate !== 'custom') {
				createData.template = selectedTemplate as ProviderTemplate;
			}

			const provider = await adminExternalProvidersAPI.create(createData);
			goto(`/admin/external-idp/${provider.id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create provider';
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
			Add External Identity Provider
		</h1>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		{#if error}
			<div
				style="padding: 12px 16px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 16px;"
			>
				{error}
			</div>
		{/if}

		<!-- Template Selection -->
		<div
			style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; margin-bottom: 24px;"
		>
			<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1f2937;">
				Choose a Template (Optional)
			</h2>
			<p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
				Select a provider template for pre-configured defaults, or choose "Custom" to configure
				manually.
			</p>

			<div
				style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;"
			>
				<button
					type="button"
					onclick={() => {
						selectedTemplate = 'custom';
						handleTemplateChange();
					}}
					style="
						padding: 16px;
						border: 2px solid {selectedTemplate === 'custom' ? '#3b82f6' : '#e5e7eb'};
						border-radius: 8px;
						background: {selectedTemplate === 'custom' ? '#eff6ff' : 'white'};
						cursor: pointer;
						text-align: center;
					"
				>
					<div style="font-weight: 500; color: #1f2937;">Custom</div>
					<div style="font-size: 12px; color: #6b7280;">Manual config</div>
				</button>

				{#each PROVIDER_TEMPLATES as template (template.id)}
					<button
						type="button"
						onclick={() => {
							selectedTemplate = template.id;
							handleTemplateChange();
						}}
						style="
							padding: 16px;
							border: 2px solid {selectedTemplate === template.id ? '#3b82f6' : '#e5e7eb'};
							border-radius: 8px;
							background: {selectedTemplate === template.id ? '#eff6ff' : 'white'};
							cursor: pointer;
							text-align: center;
						"
					>
						<div style="font-weight: 500; color: #1f2937;">{template.name}</div>
						<div style="font-size: 12px; color: #6b7280;">
							{template.providerType.toUpperCase()}
						</div>
					</button>
				{/each}
			</div>
		</div>

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
						placeholder="e.g., Google"
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
						placeholder="Your OAuth client ID"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
					/>
				</div>

				<div>
					<label
						for="clientSecret"
						style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #374151;"
					>
						Client Secret *
					</label>
					<input
						id="clientSecret"
						type="password"
						bind:value={clientSecret}
						required
						placeholder="Your OAuth client secret"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
					/>
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
						<p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
							For OIDC providers, the issuer URL is used to discover endpoints automatically
						</p>
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

			{#if selectedTemplate === 'custom' || providerType === 'oauth2'}
				<details style="margin-top: 16px;" open={providerType === 'oauth2'}>
					<summary style="cursor: pointer; font-size: 14px; color: #3b82f6;">
						Manual Endpoints (required for OAuth 2.0 or custom OIDC)
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
								placeholder="https://provider.com/oauth/authorize"
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
								placeholder="https://provider.com/oauth/token"
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
								placeholder="https://provider.com/oauth/userinfo"
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
								placeholder="https://provider.com/.well-known/jwks.json"
								style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background-color: white; color: #1f2937;"
							/>
						</div>
					</div>
				</details>
			{/if}
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
				{saving ? 'Creating...' : 'Create Provider'}
			</button>
		</div>
	</form>
</div>
