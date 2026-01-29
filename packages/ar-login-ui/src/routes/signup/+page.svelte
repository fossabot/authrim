<script lang="ts">
	import { Button, Input, Card, Alert } from '$lib/components';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { LL } from '$i18n/i18n-svelte';
	import { passkeyAPI, emailCodeAPI, externalIdpAPI } from '$lib/api/client';
	import { brandingStore } from '$lib/stores/branding.svelte';
	import { isValidImageUrl, isValidRedirectUrl, sanitizeColor } from '$lib/utils/url-validation';
	import { fetchLoginMethods, type SocialProvider } from '$lib/api/login-methods';
	import { startRegistration } from '@simplewebauthn/browser';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------
	let email = $state('');
	let name = $state('');
	let error = $state('');
	let passkeyLoading = $state(false);
	let emailCodeLoading = $state(false);
	let emailError = $state('');
	let nameError = $state('');
	let externalIdpLoading = $state<string | null>(null);

	// Login methods (from API)
	let methodsLoading = $state(true);
	let passkeyEnabled = $state(false);
	let emailCodeEnabled = $state(false);
	let socialEnabled = $state(false);
	let socialProviders = $state<SocialProvider[]>([]);

	// Dark mode detection for social button colors
	let isDarkMode = $state(false);

	// Derived: WebAuthn support check
	const isPasskeySupported = $derived(
		typeof window !== 'undefined' &&
			window.PublicKeyCredential !== undefined &&
			typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
	);

	const showPasskey = $derived(passkeyEnabled && isPasskeySupported);

	// ---------------------------------------------------------------------------
	// Lifecycle
	// ---------------------------------------------------------------------------
	onMount(async () => {
		// Detect dark mode from data-theme attribute or prefers-color-scheme
		const checkDarkMode = () => {
			const theme = document.documentElement.getAttribute('data-theme');
			if (theme === 'dark') return true;
			if (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
			return false;
		};
		isDarkMode = checkDarkMode();

		const observer = new MutationObserver(() => {
			isDarkMode = checkDarkMode();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		mql.addEventListener('change', () => {
			isDarkMode = checkDarkMode();
		});

		await loadLoginMethods();
	});

	async function loadLoginMethods() {
		methodsLoading = true;
		try {
			const { data } = await fetchLoginMethods();
			if (data) {
				passkeyEnabled = data.methods.passkey.enabled;
				emailCodeEnabled = data.methods.emailCode.enabled;
				socialEnabled = data.methods.social.enabled;
				socialProviders = data.methods.social.providers;
			}
		} catch {
			// Fallback: enable all methods
			passkeyEnabled = true;
			emailCodeEnabled = true;
		} finally {
			methodsLoading = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------
	function validateEmail(value: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	function validateForm(): boolean {
		emailError = '';
		nameError = '';

		if (!name.trim()) {
			nameError = $LL.register_errorNameRequired();
			return false;
		}
		if (!email.trim()) {
			emailError = $LL.login_errorEmailRequired();
			return false;
		}
		if (!validateEmail(email)) {
			emailError = $LL.login_errorEmailInvalid();
			return false;
		}
		return true;
	}

	async function handlePasskeyRegister() {
		if (passkeyLoading) return;
		error = '';
		if (!validateForm()) return;

		passkeyLoading = true;

		try {
			const { data: optionsData, error: optionsError } = await passkeyAPI.getRegisterOptions({
				email,
				name
			});

			if (optionsError) {
				throw new Error(optionsError.error_description || 'Failed to get registration options');
			}
			if (!optionsData?.options) {
				throw new Error('Invalid response from server: missing options');
			}

			/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
			const credential = await startRegistration({ optionsJSON: optionsData.options as any });

			const { data: verifyData, error: verifyError } = await passkeyAPI.verifyRegistration({
				userId: optionsData.userId,
				credential,
				deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop'
			});

			if (verifyError) {
				throw new Error(verifyError.error_description || 'Registration verification failed');
			}

			// Save session after successful registration
			if (verifyData?.sessionId) {
				auth.login(verifyData.sessionId, {
					userId: verifyData.userId,
					email: verifyData.user.email,
					name: verifyData.user.name || undefined
				});
			}

			window.location.href = '/';
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred during passkey registration';
		} finally {
			passkeyLoading = false;
		}
	}

	async function handleEmailCodeSignup() {
		if (emailCodeLoading) return;
		error = '';
		if (!validateForm()) return;

		emailCodeLoading = true;

		try {
			const { error: apiError } = await emailCodeAPI.send({ email, name });
			if (apiError) {
				throw new Error(apiError.error_description || 'Failed to send verification code');
			}
			window.location.href = `/verify-email-code?email=${encodeURIComponent(email)}`;
		} catch (err) {
			error =
				err instanceof Error ? err.message : 'An error occurred while sending verification code';
		} finally {
			emailCodeLoading = false;
		}
	}

	async function handleExternalLogin(providerId: string) {
		externalIdpLoading = providerId;
		try {
			const { url } = await externalIdpAPI.startLogin(providerId);
			if (!isValidRedirectUrl(url)) {
				throw new Error('Invalid redirect URL from identity provider');
			}
			window.location.href = url;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start external login';
			externalIdpLoading = null;
		}
	}

	function getProviderIcon(provider: SocialProvider): string {
		if (provider.iconUrl) return provider.iconUrl;
		const providerName = (provider.name || '').toLowerCase();
		if (providerName.includes('google')) return 'i-ph-google-logo';
		if (providerName.includes('github')) return 'i-ph-github-logo';
		if (providerName.includes('microsoft') || providerName.includes('azure'))
			return 'i-ph-windows-logo';
		if (providerName.includes('apple')) return 'i-ph-apple-logo';
		if (providerName.includes('facebook') || providerName.includes('meta'))
			return 'i-ph-meta-logo';
		if (providerName.includes('twitter') || providerName.includes('x.com'))
			return 'i-ph-x-logo';
		if (providerName.includes('linkedin')) return 'i-ph-linkedin-logo';
		return 'i-ph-sign-in';
	}

	function getProviderButtonText(provider: SocialProvider): string {
		if (provider.buttonText) return provider.buttonText;
		return $LL.login_continueWith({ provider: provider.name });
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleEmailCodeSignup();
		}
	}
</script>

<svelte:head>
	<title>{$LL.register_title()} - {brandingStore.brandName || $LL.app_title()}</title>
	<meta
		name="description"
		content="Create a new account using passkey or email code authentication."
	/>
</svelte:head>

<div class="auth-page">
	<LanguageSwitcher />

	<div class="auth-container">
		<!-- Header -->
		<div class="auth-header">
			{#if brandingStore.logoUrl && isValidImageUrl(brandingStore.logoUrl)}
				<img
					src={brandingStore.logoUrl}
					alt={brandingStore.brandName || 'Logo'}
					class="auth-header__logo"
					onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
				/>
			{/if}
			<h1 class="auth-header__title">
				{brandingStore.brandName || $LL.app_title()}
			</h1>
			<p class="auth-header__subtitle">
				{$LL.app_subtitle()}
			</p>
		</div>

		<!-- Loading State -->
		{#if methodsLoading}
			<Card class="mb-6">
				<div class="flex flex-col items-center justify-center py-8 gap-3">
					<div
						class="h-8 w-8 border-3 rounded-full animate-spin"
						style="border-color: var(--border); border-top-color: var(--primary);"
					></div>
					<p style="color: var(--text-muted); font-size: 0.875rem;">{$LL.common_loading()}</p>
				</div>
			</Card>
		{:else}
			<!-- Registration Card -->
			<Card class="mb-6">
				<div class="mb-6">
					<h2 class="auth-section-title">
						{$LL.register_title()}
					</h2>
					<p class="auth-section-subtitle">
						{$LL.register_subtitle()}
					</p>
				</div>

				<!-- Error Alert -->
				{#if error}
					<Alert variant="error" dismissible={true} onDismiss={() => (error = '')} class="mb-4">
						{error}
					</Alert>
				{/if}

				<!-- Name Input -->
				<div class="mb-4">
					<Input
						label={$LL.common_name()}
						type="text"
						placeholder={$LL.common_namePlaceholder()}
						bind:value={name}
						error={nameError}
						autocomplete="name"
						required
					/>
				</div>

				<!-- Email Input -->
				<div class="mb-6">
					<Input
						label={$LL.common_email()}
						type="email"
						placeholder={$LL.common_emailPlaceholder()}
						bind:value={email}
						error={emailError}
						onkeypress={handleKeyPress}
						autocomplete="email"
						required
					/>
				</div>

				<!-- Passkey Button -->
				{#if showPasskey}
					<Button
						variant="primary"
						class="w-full mb-3"
						loading={passkeyLoading}
						disabled={emailCodeLoading}
						onclick={handlePasskeyRegister}
					>
						<div class="i-heroicons-key h-5 w-5"></div>
						{$LL.register_createWithPasskey()}
					</Button>

					{#if emailCodeEnabled}
						<div class="auth-divider">
							<div class="auth-divider__line"></div>
							<span class="auth-divider__text">{$LL.common_or()}</span>
							<div class="auth-divider__line"></div>
						</div>
					{/if}
				{/if}

				<!-- Email Code Button -->
				{#if emailCodeEnabled}
					<Button
						variant="secondary"
						class="w-full"
						loading={emailCodeLoading}
						disabled={passkeyLoading || externalIdpLoading !== null}
						onclick={handleEmailCodeSignup}
					>
						<div class="i-heroicons-envelope h-5 w-5"></div>
						{$LL.register_sendCode()}
					</Button>
				{/if}

				<!-- Social Login Section -->
				{#if socialEnabled && socialProviders.length > 0}
					<div class="auth-divider" style="margin: 24px 0;">
						<div class="auth-divider__line"></div>
						<span class="auth-divider__text">{$LL.login_orContinueWith()}</span>
						<div class="auth-divider__line"></div>
					</div>

					<div class="space-y-3">
						{#each socialProviders as provider (provider.id)}
							{@const safeColor = isDarkMode && provider.buttonColorDark
								? sanitizeColor(provider.buttonColorDark)
								: sanitizeColor(provider.buttonColor)}
							<Button
								variant="secondary"
								class="w-full justify-center"
								loading={externalIdpLoading === provider.id}
								disabled={passkeyLoading ||
									emailCodeLoading ||
									(externalIdpLoading !== null && externalIdpLoading !== provider.id)}
								onclick={() => handleExternalLogin(provider.id)}
								style={safeColor ? `border-color: ${safeColor}; color: ${safeColor};` : ''}
							>
								<div class="{getProviderIcon(provider)} h-5 w-5"></div>
								{getProviderButtonText(provider)}
							</Button>
						{/each}
					</div>
				{/if}

				<!-- Terms Agreement -->
				<p class="mt-4 text-xs text-center" style="color: var(--text-muted);">
					{$LL.register_termsAgreement()}
				</p>
			</Card>
		{/if}

		<!-- Sign In Link -->
		<p class="auth-bottom-link">
			<a href="/login">
				{$LL.register_alreadyHaveAccount()}
			</a>
		</p>
	</div>

	<!-- Footer -->
	<footer class="auth-footer">
		<p>{$LL.footer_stack()}</p>
	</footer>
</div>
