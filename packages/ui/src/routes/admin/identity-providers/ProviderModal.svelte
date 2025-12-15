<script lang="ts">
	import { Button, Input, Dialog } from '$lib/components';
	import { externalIdpAdminAPI } from '$lib/api/client';

	interface Provider {
		id: string;
		name: string;
		providerType: 'oidc' | 'oauth2';
		enabled: boolean;
		issuer?: string;
		clientId: string;
		hasSecret: boolean;
		scopes: string;
		autoLinkEmail: boolean;
		jitProvisioning: boolean;
		requireEmailVerified?: boolean;
		iconUrl?: string;
		buttonColor?: string;
		buttonText?: string;
		providerQuirks?: Record<string, unknown>;
	}

	// Microsoft tenant types
	type MicrosoftTenantType = 'common' | 'organizations' | 'consumers' | 'custom';

	const microsoftTenantOptions = [
		{
			value: 'common',
			label: 'All accounts',
			description: 'Allow both personal Microsoft accounts and organizational accounts'
		},
		{
			value: 'organizations',
			label: 'Organizational accounts only',
			description: 'Only allow Microsoft Entra ID (work/school) accounts'
		},
		{
			value: 'consumers',
			label: 'Personal accounts only',
			description: 'Only allow personal Microsoft accounts (Xbox, OneDrive, Outlook.com)'
		},
		{
			value: 'custom',
			label: 'Specific tenant',
			description: 'Only allow accounts from a specific organization (enter tenant ID)'
		}
	];

	interface Props {
		provider: Provider | null;
		onSave: () => void;
		onClose: () => void;
	}

	let { provider, onSave, onClose }: Props = $props();

	// Extract Microsoft tenant type from existing provider
	function extractMicrosoftTenantType(p: Provider | null): {
		type: MicrosoftTenantType;
		customTenant: string;
	} {
		const quirks = p?.providerQuirks as { tenantType?: string } | undefined;
		const tenantType = quirks?.tenantType || 'common';

		if (['common', 'organizations', 'consumers'].includes(tenantType)) {
			return { type: tenantType as MicrosoftTenantType, customTenant: '' };
		}
		// Custom tenant ID
		return { type: 'custom', customTenant: tenantType };
	}

	// Form state
	let name = $state(provider?.name || '');
	let providerType = $state<'oidc' | 'oauth2'>(provider?.providerType || 'oidc');
	let clientId = $state(provider?.clientId || '');
	let clientSecret = $state('');
	let issuer = $state(provider?.issuer || '');
	let scopes = $state(provider?.scopes || 'openid email profile');
	let enabled = $state(provider?.enabled ?? true);
	let autoLinkEmail = $state(provider?.autoLinkEmail ?? true);
	let jitProvisioning = $state(provider?.jitProvisioning ?? true);
	let requireEmailVerified = $state(provider?.requireEmailVerified ?? true);
	let iconUrl = $state(provider?.iconUrl || '');
	let buttonColor = $state(provider?.buttonColor || '');
	let buttonText = $state(provider?.buttonText || '');
	let template = $state<'google' | 'github' | 'microsoft' | ''>('');

	// Microsoft-specific settings
	const initialMsTenant = extractMicrosoftTenantType(provider);
	let microsoftTenantType = $state<MicrosoftTenantType>(initialMsTenant.type);
	let microsoftCustomTenant = $state(initialMsTenant.customTenant);

	// Check if this is a Microsoft provider (for showing tenant settings)
	const isMicrosoftProvider = $derived(
		template === 'microsoft' ||
			issuer.includes('login.microsoftonline.com') ||
			name.toLowerCase().includes('microsoft') ||
			name.toLowerCase().includes('entra')
	);

	// Build Microsoft issuer URL based on tenant type
	function getMicrosoftIssuer(tenantType: MicrosoftTenantType, customTenant: string): string {
		const tenant = tenantType === 'custom' ? customTenant : tenantType;
		return `https://login.microsoftonline.com/${tenant || 'common'}/v2.0`;
	}

	let saving = $state(false);
	let error = $state('');
	let showAdvanced = $state(false);

	const isEditing = provider !== null;

	// Template configurations
	const templates = {
		google: {
			name: 'Google',
			issuer: 'https://accounts.google.com',
			scopes: 'openid email profile',
			iconUrl: '',
			buttonColor: '#4285F4',
			buttonText: 'Continue with Google'
		},
		github: {
			name: 'GitHub',
			issuer: '',
			scopes: 'read:user user:email',
			iconUrl: '',
			buttonColor: '#24292e',
			buttonText: 'Continue with GitHub'
		},
		microsoft: {
			name: 'Microsoft',
			issuer: 'https://login.microsoftonline.com/common/v2.0',
			scopes: 'openid email profile',
			iconUrl: '',
			buttonColor: '#00a4ef',
			buttonText: 'Continue with Microsoft'
		}
	};

	function applyTemplate(t: 'google' | 'github' | 'microsoft') {
		const config = templates[t];
		name = config.name;
		issuer = config.issuer;
		scopes = config.scopes;
		buttonColor = config.buttonColor;
		buttonText = config.buttonText;
		providerType = t === 'github' ? 'oauth2' : 'oidc';
		template = t;

		// Initialize Microsoft-specific settings
		if (t === 'microsoft') {
			microsoftTenantType = 'common';
			microsoftCustomTenant = '';
		}
	}

	// Auto-update issuer when Microsoft tenant settings change
	$effect(() => {
		if (isMicrosoftProvider) {
			issuer = getMicrosoftIssuer(microsoftTenantType, microsoftCustomTenant);
		}
	});

	async function handleSubmit() {
		error = '';

		// Validation
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}
		if (!clientId.trim()) {
			error = 'Client ID is required';
			return;
		}
		if (!isEditing && !clientSecret.trim()) {
			error = 'Client Secret is required';
			return;
		}
		if (providerType === 'oidc' && !issuer.trim()) {
			error = 'Issuer URL is required for OIDC providers';
			return;
		}

		// Validate Microsoft custom tenant ID
		if (isMicrosoftProvider && microsoftTenantType === 'custom') {
			const customTenant = microsoftCustomTenant.trim();
			if (!customTenant) {
				error = 'Tenant ID or domain is required for specific tenant configuration';
				return;
			}
			// Validate format: GUID or domain
			const isValidGuid =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customTenant);
			const isValidDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(customTenant);
			if (!isValidGuid && !isValidDomain) {
				error =
					'Invalid tenant format. Please enter a valid GUID (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or domain (e.g., contoso.onmicrosoft.com)';
				return;
			}
		}

		saving = true;

		// Build provider quirks for Microsoft
		let providerQuirks: Record<string, unknown> | undefined;
		if (isMicrosoftProvider) {
			const effectiveTenant =
				microsoftTenantType === 'custom' ? microsoftCustomTenant.trim() : microsoftTenantType;
			providerQuirks = { tenantType: effectiveTenant };
		}

		try {
			if (isEditing) {
				// Update existing provider
				const updateData: Record<string, unknown> = {
					name,
					provider_type: providerType,
					client_id: clientId,
					issuer: issuer || undefined,
					scopes,
					enabled,
					auto_link_email: autoLinkEmail,
					jit_provisioning: jitProvisioning,
					require_email_verified: requireEmailVerified,
					icon_url: iconUrl || undefined,
					button_color: buttonColor || undefined,
					button_text: buttonText || undefined,
					provider_quirks: providerQuirks
				};

				// Only include secret if changed
				if (clientSecret.trim()) {
					updateData.client_secret = clientSecret;
				}

				const { error: apiError } = await externalIdpAdminAPI.update(provider.id, updateData);
				if (apiError) {
					error = apiError.error_description || 'Failed to update provider';
					return;
				}
			} else {
				// Create new provider
				const createData = {
					name,
					provider_type: providerType,
					client_id: clientId,
					client_secret: clientSecret,
					issuer: issuer || undefined,
					scopes,
					enabled,
					auto_link_email: autoLinkEmail,
					jit_provisioning: jitProvisioning,
					require_email_verified: requireEmailVerified,
					icon_url: iconUrl || undefined,
					button_color: buttonColor || undefined,
					button_text: buttonText || undefined,
					template: template || undefined,
					provider_quirks: providerQuirks
				};

				const { error: apiError } = await externalIdpAdminAPI.create(createData);
				if (apiError) {
					error = apiError.error_description || 'Failed to create provider';
					return;
				}
			}

			onSave();
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog open={true} title={isEditing ? `Edit ${provider.name}` : 'Add Identity Provider'}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-6"
	>
		<!-- Error message -->
		{#if error}
			<div
				class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
			>
				{error}
			</div>
		{/if}

		<!-- Template selector (only for new providers) -->
		{#if !isEditing}
			<div>
				<p class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Quick Start Template
				</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {template ===
						'google'
							? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
							: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}"
						onclick={() => applyTemplate('google')}
					>
						<div class="i-logos-google-icon h-4 w-4"></div>
						Google
					</button>
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {template ===
						'github'
							? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
							: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}"
						onclick={() => applyTemplate('github')}
					>
						<div class="i-logos-github-icon h-4 w-4"></div>
						GitHub
					</button>
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {template ===
						'microsoft'
							? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
							: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}"
						onclick={() => applyTemplate('microsoft')}
					>
						<div class="i-logos-microsoft-icon h-4 w-4"></div>
						Microsoft
					</button>
				</div>
			</div>
		{/if}

		<!-- Basic Info -->
		<div class="grid gap-4 sm:grid-cols-2">
			<Input label="Provider Name" bind:value={name} placeholder="e.g., Google" required />

			<div>
				<label
					for="providerType"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Provider Type
				</label>
				<select
					id="providerType"
					bind:value={providerType}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="oidc">OpenID Connect (OIDC)</option>
					<option value="oauth2">OAuth 2.0</option>
				</select>
			</div>
		</div>

		<!-- OAuth Credentials -->
		<div class="grid gap-4 sm:grid-cols-2">
			<Input label="Client ID" bind:value={clientId} placeholder="Your OAuth client ID" required />

			<Input
				label={isEditing ? 'Client Secret (leave blank to keep)' : 'Client Secret'}
				type="password"
				bind:value={clientSecret}
				placeholder={isEditing ? '••••••••' : 'Your OAuth client secret'}
				required={!isEditing}
			/>
		</div>

		<!-- OIDC Settings -->
		{#if providerType === 'oidc'}
			<!-- Microsoft Tenant Settings -->
			{#if isMicrosoftProvider}
				<div class="space-y-3">
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Account Types
					</label>
					<div class="space-y-2">
						{#each microsoftTenantOptions as option (option.value)}
							<label
								class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors {microsoftTenantType ===
								option.value
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
							>
								<input
									type="radio"
									name="microsoftTenant"
									value={option.value}
									checked={microsoftTenantType === option.value}
									onchange={() => {
										microsoftTenantType = option.value as MicrosoftTenantType;
									}}
									class="mt-0.5 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-gray-900 dark:text-white">
										{option.label}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{option.description}
									</div>
								</div>
							</label>
						{/each}
					</div>

					<!-- Custom tenant ID input -->
					{#if microsoftTenantType === 'custom'}
						<div class="mt-3">
							<Input
								label="Tenant ID or Domain"
								bind:value={microsoftCustomTenant}
								placeholder="e.g., contoso.onmicrosoft.com or GUID"
								required
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Enter the Azure AD tenant ID (GUID) or domain name
							</p>
						</div>
					{/if}
				</div>

				<!-- Show computed issuer (read-only for Microsoft) -->
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Issuer URL (auto-generated)
					</label>
					<input
						type="text"
						value={issuer}
						readonly
						class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
					/>
				</div>
			{:else}
				<Input
					label="Issuer URL"
					bind:value={issuer}
					placeholder="https://accounts.google.com"
					required
				/>
			{/if}
		{/if}

		<Input label="Scopes" bind:value={scopes} placeholder="openid email profile" />

		<!-- Toggles -->
		<div class="space-y-3">
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={enabled}
					class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
				/>
				<span class="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
			</label>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={autoLinkEmail}
					class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
				/>
				<span class="text-sm text-gray-700 dark:text-gray-300"
					>Auto-link by email (match existing users)</span
				>
			</label>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					bind:checked={jitProvisioning}
					class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
				/>
				<span class="text-sm text-gray-700 dark:text-gray-300"
					>Just-in-Time provisioning (create new users)</span
				>
			</label>
		</div>

		<!-- Advanced Settings -->
		<div>
			<button
				type="button"
				class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
				onclick={() => (showAdvanced = !showAdvanced)}
			>
				<div
					class="i-heroicons-chevron-right h-4 w-4 transition-transform {showAdvanced
						? 'rotate-90'
						: ''}"
				></div>
				Advanced Settings
			</button>

			{#if showAdvanced}
				<div class="mt-4 space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
					<label class="flex items-center gap-3">
						<input
							type="checkbox"
							bind:checked={requireEmailVerified}
							class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
						/>
						<span class="text-sm text-gray-700 dark:text-gray-300"
							>Require verified email from provider</span
						>
					</label>

					<Input label="Icon URL" bind:value={iconUrl} placeholder="https://example.com/icon.png" />

					<div class="grid gap-4 sm:grid-cols-2">
						<Input
							label="Button Color"
							type="text"
							bind:value={buttonColor}
							placeholder="#4285F4"
						/>
						<Input
							label="Button Text"
							bind:value={buttonText}
							placeholder="Continue with Provider"
						/>
					</div>
				</div>
			{/if}
		</div>
	</form>

	<div slot="footer" class="flex justify-end gap-3">
		<Button variant="secondary" onclick={onClose} disabled={saving}>Cancel</Button>
		<Button variant="primary" onclick={handleSubmit} loading={saving}>
			{isEditing ? 'Save Changes' : 'Create Provider'}
		</Button>
	</div>
</Dialog>
