<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Alert, Spinner } from '$lib/components';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { LL } from '$i18n/i18n-svelte';
	import { brandingStore } from '$lib/stores/branding.svelte';
	import { isValidReturnUrl } from '$lib/utils/url-validation';

	let status = $state<'processing' | 'success' | 'error'>('processing');
	let errorMessage = $state('');
	let errorCode = $state('');

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);

		// Check for error response from the OP
		const error = params.get('error');
		if (error) {
			errorCode = error;
			errorMessage = params.get('error_description') || getErrorMessage(error);
			status = 'error';
			return;
		}

		// Extract authorization code and state
		const code = params.get('code');
		const state = params.get('state');

		if (!code) {
			errorCode = 'missing_code';
			errorMessage = $LL.callback_errorMissingCode();
			status = 'error';
			return;
		}

		// Validate state against stored value (CSRF protection)
		const storedState = sessionStorage.getItem('oauth_state');
		// Clean up OAuth session data immediately after reading
		sessionStorage.removeItem('oauth_state');
		sessionStorage.removeItem('oauth_code_verifier');
		// Both state and storedState must be present and match
		if (!state || !storedState || state !== storedState) {
			errorCode = 'state_mismatch';
			errorMessage = $LL.callback_errorStateMismatch();
			status = 'error';
			return;
		}

		try {
			// Exchange authorization code for session
			const response = await fetch('/api/auth/callback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					code,
					state,
					redirect_uri: `${window.location.origin}/callback`
				})
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				errorCode = data.error || 'callback_failed';
				errorMessage = data.error_description || $LL.callback_errorExchangeFailed();
				status = 'error';
				return;
			}

			status = 'success';

			// Redirect to the stored return URL or home
			const storedReturnUrl = sessionStorage.getItem('oauth_return_url');
			sessionStorage.removeItem('oauth_return_url');
			// SECURITY: Only allow same-origin return URLs to prevent open redirect
			const returnUrl =
				storedReturnUrl && isValidReturnUrl(storedReturnUrl) ? storedReturnUrl : '/';

			setTimeout(() => {
				window.location.href = returnUrl;
			}, 1000);
		} catch {
			errorCode = 'network_error';
			errorMessage = $LL.callback_errorNetwork();
			status = 'error';
		}
	});

	function getErrorMessage(code: string): string {
		const messages: Record<string, () => string> = {
			access_denied: () => $LL.error_access_denied(),
			invalid_request: () => $LL.error_invalid_request(),
			server_error: () => $LL.error_server_error(),
			temporarily_unavailable: () => $LL.error_temporarily_unavailable()
		};
		return (messages[code] || (() => $LL.error_unknown()))();
	}

	function handleRetry() {
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>{$LL.callback_title()} - {brandingStore.brandName || $LL.app_title()}</title>
</svelte:head>

<div class="auth-page">
	<LanguageSwitcher />

	<div class="auth-container">
		<!-- Header -->
		<div class="auth-header">
			<h1 class="auth-header__title">
				{brandingStore.brandName || $LL.app_title()}
			</h1>
		</div>

		<Card class="text-center">
			{#if status === 'processing'}
				<!-- Processing -->
				<div class="py-8">
					<Spinner size="lg" color="primary" class="mb-4" />
					<h2 class="auth-section-title text-center">
						{$LL.callback_processing()}
					</h2>
					<p class="auth-section-subtitle text-center">
						{$LL.callback_pleaseWait()}
					</p>
				</div>
			{:else if status === 'success'}
				<!-- Success -->
				<div class="py-8">
					<div class="auth-icon-badge">
						<div class="auth-icon-badge__circle">
							<span class="i-heroicons-check-circle h-9 w-9 auth-icon-badge__icon"></span>
						</div>
					</div>
					<h2 class="auth-section-title text-center">
						{$LL.callback_success()}
					</h2>
					<p class="auth-section-subtitle text-center">
						{$LL.callback_redirecting()}
					</p>
				</div>
			{:else}
				<!-- Error -->
				<div class="auth-icon-badge">
					<div class="auth-icon-badge__circle auth-icon-badge__circle--danger">
						<span class="i-heroicons-exclamation-circle h-9 w-9 auth-icon-badge__icon"></span>
					</div>
				</div>

				<h2 class="auth-section-title text-center">
					{$LL.callback_errorTitle()}
				</h2>

				<Alert variant="error" class="mb-4 text-left">
					<p>{errorMessage}</p>
				</Alert>

				{#if errorCode}
					<div class="auth-error-code-box mb-6">
						<p class="auth-error-code-box__label">
							{$LL.error_errorCode()}
						</p>
						<p class="auth-error-code-box__value">
							{errorCode}
						</p>
					</div>
				{/if}

				<button class="btn-primary w-full" onclick={handleRetry}>
					{$LL.common_backToLogin()}
				</button>
			{/if}
		</Card>
	</div>

	<!-- Footer -->
	<footer class="auth-footer">
		<p>{$LL.footer_stack()}</p>
	</footer>
</div>
