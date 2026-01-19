<script lang="ts">
	interface Props {
		label: string;
	}

	let { label }: Props = $props();
</script>

<div class="nav-group-label">{label}</div>

<style>
	.nav-group-label {
		padding: 16px 12px 8px 12px;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
		overflow: hidden;
		margin-top: 8px;
	}

	.nav-group-label:first-of-type {
		margin-top: 0;
	}

	/* Visibility control - hidden when collapsed */
	:global(.nav-floating:not(.expanded):not(.open)) .nav-group-label {
		opacity: 0;
	}

	:global(.nav-floating.expanded) .nav-group-label,
	:global(.nav-floating.open) .nav-group-label {
		opacity: 1;
		white-space: normal;
		word-wrap: break-word;
		line-height: 1.3;
	}

	/* Korean: Break only at word boundaries */
	:global([lang='ko']) :global(.nav-floating.expanded) .nav-group-label,
	:global([lang='ko']) :global(.nav-floating.open) .nav-group-label {
		word-break: keep-all;
	}
</style>
