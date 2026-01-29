<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** Duration in seconds */
		duration?: number;
		/** Whether the timer should auto-start on mount */
		autoStart?: boolean;
		/** Called when countdown reaches zero */
		onComplete?: () => void;
	}

	let { duration = 60, autoStart = true, onComplete }: Props = $props();

	let remaining = $state(0);
	let intervalId: number | null = null;

	onMount(() => {
		remaining = duration;
		if (autoStart) {
			start();
		}

		return () => {
			stop();
		};
	});

	function start() {
		remaining = duration;

		if (intervalId !== null) {
			clearInterval(intervalId);
		}

		intervalId = window.setInterval(() => {
			remaining -= 1;

			if (remaining <= 0) {
				stop();
				onComplete?.();
			}
		}, 1000);
	}

	function stop() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	/** Restart the countdown timer */
	export function restart() {
		start();
	}
</script>

<!--
  CountdownTimer
  - Displays remaining seconds
  - Renders children via snippet, or default text
  - Exposes `restart()` method for parent components
-->

{#snippet defaultDisplay()}
	<span>{remaining}s</span>
{/snippet}

{@render defaultDisplay()}
