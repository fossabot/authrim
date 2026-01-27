<script lang="ts">
	/**
	 * WorldMap Component
	 *
	 * Interactive world map visualization for Scale page.
	 * Shows Cloudflare datacenter locations, region highlighting,
	 * and animated traffic arcs based on region selection.
	 *
	 * Design: Cyberpunk / Data Flow Visualization
	 * - Dark base with electronic glow effects
	 * - Neon cyan and electric blue accents
	 * - Animated traffic pulses between regions
	 */
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { FeatureCollection, Feature, Geometry } from 'geojson';

	// =========================================================================
	// Types
	// =========================================================================
	interface CountryProperties {
		CONTINENT: string;
		NAME: string;
		ISO_A3: string;
		[key: string]: unknown;
	}

	interface Datacenter {
		region: string;
		city: string;
		lat: number;
		lon: number;
	}

	// =========================================================================
	// Props
	// =========================================================================
	let {
		selectedRegions = [],
		regionDistribution: _regionDistribution = {},
		onRegionClick
	}: {
		selectedRegions: string[];
		regionDistribution: Record<string, number>;
		onRegionClick?: (region: string) => void;
	} = $props();

	// Note: _regionDistribution is currently unused (all arcs have uniform weight)
	// but kept for potential future use with weighted arc visualization
	void _regionDistribution;

	// =========================================================================
	// Constants
	// =========================================================================

	// Cloudflare DO datacenter locations (isDOCapable: true only)
	// Source: https://where.durableobjects.live
	// Note: AFR and ME regions have no DO-capable datacenters
	const CF_DATACENTERS: Datacenter[] = [
		// APAC (Asia Pacific) - 5 DCs
		{ region: 'apac', city: 'Tokyo', lat: 35.76, lon: 140.39 }, // NRT
		{ region: 'apac', city: 'Osaka', lat: 34.43, lon: 135.24 }, // KIX
		{ region: 'apac', city: 'Singapore', lat: 1.35, lon: 103.99 }, // SIN
		{ region: 'apac', city: 'Hong Kong', lat: 22.31, lon: 113.92 }, // HKG
		{ region: 'apac', city: 'Seoul', lat: 37.47, lon: 126.45 }, // ICN
		// ENAM (Eastern North America) - 5 DCs
		{ region: 'enam', city: 'Ashburn', lat: 38.94, lon: -77.46 }, // IAD
		{ region: 'enam', city: 'Newark', lat: 40.69, lon: -74.17 }, // EWR
		{ region: 'enam', city: 'Atlanta', lat: 33.64, lon: -84.43 }, // ATL
		{ region: 'enam', city: 'Dallas', lat: 32.9, lon: -97.04 }, // DFW
		{ region: 'enam', city: 'Miami', lat: 25.79, lon: -80.29 }, // MIA
		// WNAM (Western North America) - 4 DCs
		{ region: 'wnam', city: 'San Jose', lat: 37.36, lon: -121.93 }, // SJC
		{ region: 'wnam', city: 'Los Angeles', lat: 33.94, lon: -118.41 }, // LAX
		{ region: 'wnam', city: 'Seattle', lat: 47.45, lon: -122.31 }, // SEA
		{ region: 'wnam', city: 'Denver', lat: 39.86, lon: -104.67 }, // DEN
		// WEUR (Western Europe) - 13 DCs
		{ region: 'weur', city: 'Amsterdam', lat: 52.31, lon: 4.77 }, // AMS
		{ region: 'weur', city: 'Frankfurt', lat: 50.03, lon: 8.56 }, // FRA
		{ region: 'weur', city: 'London', lat: 51.47, lon: -0.46 }, // LHR
		{ region: 'weur', city: 'Paris', lat: 49.01, lon: 2.55 }, // CDG
		{ region: 'weur', city: 'Stockholm', lat: 59.65, lon: 17.93 }, // ARN
		{ region: 'weur', city: 'Warsaw', lat: 52.17, lon: 20.97 }, // WAW
		{ region: 'weur', city: 'Vienna', lat: 48.11, lon: 16.57 }, // VIE
		{ region: 'weur', city: 'Zurich', lat: 47.46, lon: 8.55 }, // ZRH
		{ region: 'weur', city: 'Prague', lat: 50.1, lon: 14.26 }, // PRG
		{ region: 'weur', city: 'Lisbon', lat: 38.78, lon: -9.14 }, // LIS
		{ region: 'weur', city: 'Madrid', lat: 40.47, lon: -3.56 }, // MAD
		{ region: 'weur', city: 'Marseille', lat: 43.44, lon: 5.21 }, // MRS
		{ region: 'weur', city: 'Milan', lat: 45.63, lon: 8.73 }, // MXP
		// OC (Oceania) - 4 DCs
		{ region: 'oc', city: 'Sydney', lat: -33.95, lon: 151.18 }, // SYD
		{ region: 'oc', city: 'Auckland', lat: -37.01, lon: 174.79 }, // AKL
		{ region: 'oc', city: 'Melbourne', lat: -37.67, lon: 144.84 }, // MEL
		{ region: 'oc', city: 'Brisbane', lat: -27.38, lon: 153.12 } // BNE
	];

	// GeoJSON continent to Authrim region mapping
	const CONTINENT_TO_REGION: Record<string, string> = {
		Asia: 'apac',
		'North America': 'enam', // Default to enam, but we'll check longitude for wnam
		Europe: 'weur',
		Africa: 'afr',
		Oceania: 'oc',
		'South America': 'enam', // Route to nearest (enam)
		Antarctica: 'oc'
	};

	// Cloudflare PoP locations (IATA codes with coordinates)
	// Source: https://github.com/LufsX/Cloudflare-Data-Center-IATA-Code-list
	// Representative subset for performance (~80 major locations)
	interface CloudflarePoP {
		iata: string;
		lat: number;
		lon: number;
	}

	// Selected representative PoPs for performance (major cities only)
	// Full list has 300+ locations but causes performance issues
	const CLOUDFLARE_POPS: CloudflarePoP[] = [
		// North America - Major cities
		{ iata: 'ATL', lat: 33.64, lon: -84.43 }, // Atlanta
		{ iata: 'BOS', lat: 42.36, lon: -71.01 }, // Boston
		{ iata: 'DEN', lat: 39.86, lon: -104.67 }, // Denver
		{ iata: 'DFW', lat: 32.9, lon: -97.04 }, // Dallas
		{ iata: 'EWR', lat: 40.69, lon: -74.17 }, // Newark
		{ iata: 'IAD', lat: 38.94, lon: -77.46 }, // Ashburn
		{ iata: 'LAX', lat: 33.94, lon: -118.41 }, // Los Angeles
		{ iata: 'MIA', lat: 25.79, lon: -80.29 }, // Miami
		{ iata: 'ORD', lat: 41.98, lon: -87.9 }, // Chicago
		{ iata: 'SEA', lat: 47.45, lon: -122.31 }, // Seattle
		{ iata: 'SFO', lat: 37.62, lon: -122.38 }, // San Francisco
		{ iata: 'SJC', lat: 37.36, lon: -121.93 }, // San Jose
		{ iata: 'YUL', lat: 45.47, lon: -73.74 }, // Montreal
		{ iata: 'YVR', lat: 49.19, lon: -123.18 }, // Vancouver
		{ iata: 'YYZ', lat: 43.68, lon: -79.63 }, // Toronto
		// Latin America
		{ iata: 'BOG', lat: 4.7, lon: -74.15 }, // Bogota
		{ iata: 'EZE', lat: -34.82, lon: -58.54 }, // Buenos Aires
		{ iata: 'GRU', lat: -23.43, lon: -46.47 }, // Sao Paulo
		{ iata: 'LIM', lat: -12.02, lon: -77.11 }, // Lima
		{ iata: 'MEX', lat: 19.44, lon: -99.07 }, // Mexico City
		{ iata: 'SCL', lat: -33.39, lon: -70.79 }, // Santiago
		// Europe - Western
		{ iata: 'AMS', lat: 52.31, lon: 4.77 }, // Amsterdam
		{ iata: 'CDG', lat: 49.01, lon: 2.55 }, // Paris
		{ iata: 'DUB', lat: 53.42, lon: -6.27 }, // Dublin
		{ iata: 'FRA', lat: 50.03, lon: 8.57 }, // Frankfurt
		{ iata: 'LHR', lat: 51.47, lon: -0.46 }, // London
		{ iata: 'LIS', lat: 38.77, lon: -9.13 }, // Lisbon
		{ iata: 'MAD', lat: 40.47, lon: -3.56 }, // Madrid
		{ iata: 'MRS', lat: 43.44, lon: 5.22 }, // Marseille
		{ iata: 'MXP', lat: 45.63, lon: 8.72 }, // Milan
		{ iata: 'VIE', lat: 48.11, lon: 16.57 }, // Vienna
		{ iata: 'ZRH', lat: 47.46, lon: 8.55 }, // Zurich
		// Europe - Nordic
		{ iata: 'ARN', lat: 59.65, lon: 17.94 }, // Stockholm
		{ iata: 'CPH', lat: 55.62, lon: 12.66 }, // Copenhagen
		{ iata: 'HEL', lat: 60.32, lon: 24.95 }, // Helsinki
		{ iata: 'OSL', lat: 60.19, lon: 11.1 }, // Oslo
		// Europe - Eastern
		{ iata: 'ATH', lat: 37.94, lon: 23.94 }, // Athens
		{ iata: 'BUD', lat: 47.44, lon: 19.26 }, // Budapest
		{ iata: 'PRG', lat: 50.1, lon: 14.26 }, // Prague
		{ iata: 'WAW', lat: 52.17, lon: 20.97 }, // Warsaw
		// Middle East
		{ iata: 'DOH', lat: 25.26, lon: 51.57 }, // Doha
		{ iata: 'DXB', lat: 25.25, lon: 55.36 }, // Dubai
		{ iata: 'IST', lat: 41.27, lon: 28.75 }, // Istanbul
		{ iata: 'TLV', lat: 32.01, lon: 34.88 }, // Tel Aviv
		// Africa
		{ iata: 'CAI', lat: 30.11, lon: 31.4 }, // Cairo
		{ iata: 'CPT', lat: -33.97, lon: 18.6 }, // Cape Town
		{ iata: 'JNB', lat: -26.14, lon: 28.25 }, // Johannesburg
		{ iata: 'LOS', lat: 6.58, lon: 3.32 }, // Lagos
		{ iata: 'NBO', lat: -1.32, lon: 36.93 }, // Nairobi
		// Asia - Japan
		{ iata: 'KIX', lat: 34.43, lon: 135.24 }, // Osaka
		{ iata: 'NRT', lat: 35.76, lon: 140.39 }, // Tokyo
		// Asia - China
		{ iata: 'PKX', lat: 39.51, lon: 116.41 }, // Beijing
		{ iata: 'SHA', lat: 31.2, lon: 121.34 }, // Shanghai
		{ iata: 'SZX', lat: 22.64, lon: 113.81 }, // Shenzhen
		// Asia - Other
		{ iata: 'HKG', lat: 22.31, lon: 113.91 }, // Hong Kong
		{ iata: 'ICN', lat: 37.46, lon: 126.44 }, // Seoul
		{ iata: 'SIN', lat: 1.36, lon: 103.99 }, // Singapore
		{ iata: 'TPE', lat: 25.08, lon: 121.23 }, // Taipei
		// Asia - Southeast
		{ iata: 'BKK', lat: 13.69, lon: 100.75 }, // Bangkok
		{ iata: 'CGK', lat: -6.13, lon: 106.66 }, // Jakarta
		{ iata: 'KUL', lat: 2.75, lon: 101.71 }, // Kuala Lumpur
		{ iata: 'MNL', lat: 14.51, lon: 121.02 }, // Manila
		{ iata: 'SGN', lat: 10.82, lon: 106.65 }, // Ho Chi Minh City
		// Asia - South
		{ iata: 'BLR', lat: 13.2, lon: 77.71 }, // Bangalore
		{ iata: 'BOM', lat: 19.09, lon: 72.87 }, // Mumbai
		{ iata: 'DEL', lat: 28.56, lon: 77.1 }, // Delhi
		// Oceania
		{ iata: 'AKL', lat: -37.01, lon: 174.79 }, // Auckland
		{ iata: 'BNE', lat: -27.38, lon: 153.12 }, // Brisbane
		{ iata: 'MEL', lat: -37.67, lon: 144.84 }, // Melbourne
		{ iata: 'SYD', lat: -33.95, lon: 151.18 } // Sydney
	];

	// =========================================================================
	// State
	// =========================================================================
	let containerElement: HTMLDivElement;
	let svgElement: SVGSVGElement;
	let geoData: FeatureCollection | null = $state(null);
	let width = $state(800);
	let height = $state(400);
	let transform = $state({ x: 0, y: 0, k: 1 });
	let isDragging = $state(false);

	// =========================================================================
	// D3 Setup
	// =========================================================================
	const projection = d3.geoNaturalEarth1();
	const pathGenerator = d3.geoPath(projection);

	// =========================================================================
	// Helper Functions
	// =========================================================================

	function getRegionFromFeature(feature: Feature<Geometry, CountryProperties>): string {
		const continent = feature.properties?.CONTINENT;
		if (!continent) return 'apac';

		// Special handling for North America - split by longitude
		if (continent === 'North America') {
			// Use centroid to determine east/west
			const centroid = d3.geoCentroid(feature);
			return centroid[0] < -100 ? 'wnam' : 'enam';
		}

		// Special handling for Middle East countries
		const name = feature.properties?.NAME;
		const middleEastCountries = [
			'Saudi Arabia',
			'United Arab Emirates',
			'Qatar',
			'Kuwait',
			'Bahrain',
			'Oman',
			'Yemen',
			'Iraq',
			'Iran',
			'Israel',
			'Jordan',
			'Lebanon',
			'Syria',
			'Palestine'
		];
		if (middleEastCountries.includes(name)) {
			return 'me';
		}

		return CONTINENT_TO_REGION[continent] || 'apac';
	}

	function isRegionSelected(region: string): boolean {
		return selectedRegions.includes(region);
	}

	// Determine region from coordinates
	function getRegionFromCoords(lat: number, lon: number): string {
		// Middle East check first (specific region)
		if (lon >= 25 && lon <= 60 && lat >= 12 && lat <= 42) {
			return 'me';
		}
		// Oceania
		if ((lon >= 110 && lat <= -10) || (lon >= 165 && lat <= -30)) {
			return 'oc';
		}
		// Africa
		if (lon >= -20 && lon <= 55 && lat >= -35 && lat <= 37 && !(lat > 30 && lon > 25)) {
			return 'afr';
		}
		// Europe (including Russia west of Urals)
		if (lon >= -10 && lon <= 60 && lat >= 35 && lat <= 72) {
			return 'weur';
		}
		// North America
		if (lon >= -170 && lon <= -50 && lat >= 15 && lat <= 72) {
			return lon < -100 ? 'wnam' : 'enam';
		}
		// South America -> route to enam
		if (lon >= -85 && lon <= -30 && lat >= -55 && lat <= 15) {
			return 'enam';
		}
		// Default to APAC (Asia-Pacific)
		return 'apac';
	}

	// DO-capable regions only (AFR and ME have no DO-capable DCs)
	const DO_CAPABLE_REGIONS = ['apac', 'enam', 'wnam', 'weur', 'oc'];

	// Map non-DO-capable regions to their nearest DO-capable alternatives
	function mapToDoCapableRegion(region: string): string[] {
		switch (region) {
			case 'afr':
				// Africa routes to Western Europe (closest DO-capable region)
				return ['weur'];
			case 'me':
				// Middle East routes to Western Europe (closest DO-capable region)
				return ['weur'];
			default:
				return [region];
		}
	}

	function findNearestDatacenter(
		sourceLat: number,
		sourceLon: number,
		targetRegions?: string[]
	): { datacenter: Datacenter; region: string } | null {
		// Find the nearest datacenter from specified regions (or all if not specified)
		let regionsToSearch: string[];

		if (targetRegions && targetRegions.length > 0) {
			// Map any non-DO-capable regions to their DO-capable alternatives
			regionsToSearch = targetRegions.flatMap(mapToDoCapableRegion);
			// Remove duplicates
			regionsToSearch = [...new Set(regionsToSearch)];
		} else {
			regionsToSearch = DO_CAPABLE_REGIONS;
		}

		let nearestDc: Datacenter | null = null;
		let nearestRegion = '';
		let minDistance = Infinity;

		for (const region of regionsToSearch) {
			const dcs = CF_DATACENTERS.filter((dc) => dc.region === region);
			for (const dc of dcs) {
				const dist = Math.sqrt(Math.pow(dc.lon - sourceLon, 2) + Math.pow(dc.lat - sourceLat, 2));
				if (dist < minDistance) {
					minDistance = dist;
					nearestDc = dc;
					nearestRegion = region;
				}
			}
		}

		return nearestDc ? { datacenter: nearestDc, region: nearestRegion } : null;
	}

	// Get target datacenter for a PoP (used directly in template)
	function getTargetDatacenter(
		lat: number,
		lon: number
	): { dc: Datacenter; region: string; isSelected: boolean } | null {
		if (selectedRegions.length > 0) {
			// Find nearest among selected regions
			const nearest = findNearestDatacenter(lat, lon, selectedRegions);
			if (nearest) {
				return { dc: nearest.datacenter, region: nearest.region, isSelected: true };
			}
		}
		// Fallback: find nearest overall
		const nearestOverall = findNearestDatacenter(lat, lon);
		if (nearestOverall) {
			return { dc: nearestOverall.datacenter, region: nearestOverall.region, isSelected: false };
		}
		return null;
	}

	// =========================================================================
	// Reactive Updates
	// =========================================================================
	$effect(() => {
		if (svgElement && geoData) {
			// Update projection to fit container
			projection.fitSize([width, height], geoData);
		}
	});


	// =========================================================================
	// Lifecycle
	// =========================================================================
	onMount(() => {
		// Load GeoJSON data asynchronously (IIFE to avoid async onMount type issue)
		(async () => {
			try {
				const response = await fetch('/geo/world.geo.json');
				geoData = await response.json();
			} catch (e) {
				console.error('Failed to load world map data:', e);
			}
		})();

		// Set up resize observer
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				width = entry.contentRect.width;
				height = Math.max(300, entry.contentRect.width * 0.45);
			}
		});

		if (containerElement) {
			resizeObserver.observe(containerElement);
		}

		// Set up D3 zoom/pan behavior (horizontal pan only, with limits)
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([1, 1]) // Disable zoom, pan only
			.translateExtent([
				[-width * 0.3, 0],
				[width * 1.3, height]
			]) // Limit pan range
			.on('start', () => {
				isDragging = true;
			})
			.on('zoom', (event) => {
				// Only allow horizontal panning (lock Y axis), with bounds
				const newX = Math.max(-width * 0.3, Math.min(width * 0.3, event.transform.x));
				transform = { x: newX, y: 0, k: event.transform.k };
			})
			.on('end', () => {
				isDragging = false;
			});

		if (svgElement) {
			d3.select(svgElement).call(zoom);
		}

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div class="world-map-container" bind:this={containerElement} class:dragging={isDragging}>
	<!-- Background grid pattern -->
	<div class="grid-overlay"></div>

	<svg bind:this={svgElement} viewBox="0 0 {width} {height}" class="world-map-svg">
		<!-- Definitions for filters and gradients -->
		<defs>
			<!-- Glow filter for selected regions -->
			<filter id="glow-region" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>

			<!-- Stronger glow for datacenters -->
			<filter id="glow-dc" x="-100%" y="-100%" width="300%" height="300%">
				<feGaussianBlur stdDeviation="4" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>

			<!-- Arc glow with cyan-blue gradient effect -->
			<filter id="glow-arc" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>

			<!-- Cyan-blue gradient for active arcs (horizontal direction) - Dark theme -->
			<linearGradient id="arc-gradient-active" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="var(--arc-start, rgba(0, 255, 213, 0.15))" />
				<stop offset="35%" stop-color="var(--arc-mid, rgba(59, 130, 246, 0.5))" />
				<stop offset="70%" stop-color="var(--arc-end-mid, rgba(0, 200, 220, 0.7))" />
				<stop offset="100%" stop-color="var(--arc-end, rgba(0, 255, 213, 0.95))" />
			</linearGradient>

			<!-- Subtle gray gradient for inactive arcs -->
			<linearGradient id="arc-gradient-inactive" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="var(--arc-inactive-start, rgba(100, 100, 140, 0.05))" />
				<stop offset="50%" stop-color="var(--arc-inactive-mid, rgba(100, 100, 140, 0.12))" />
				<stop offset="100%" stop-color="var(--arc-inactive-end, rgba(100, 100, 140, 0.2))" />
			</linearGradient>

		</defs>

		<!-- Map content with D3 pan -->
		<g class="map-content" transform="translate({transform.x}, 0)">
			<!-- World map countries -->
			{#if geoData}
				<g class="countries">
					{#each geoData.features as feature (feature.properties?.ISO_A3 || Math.random())}
						{@const region = getRegionFromFeature(feature as Feature<Geometry, CountryProperties>)}
						{@const isSelected = isRegionSelected(region)}
						{@const isDoCapable = DO_CAPABLE_REGIONS.includes(region)}
						<path
							d={pathGenerator(feature) || ''}
							class="country-path"
							class:selected={isSelected}
							class:non-do-capable={!isDoCapable}
							data-region={region}
							onclick={() => isDoCapable && onRegionClick?.(region)}
							role={isDoCapable ? 'button' : 'img'}
							tabindex={isDoCapable ? 0 : -1}
							aria-label="{feature.properties?.NAME || 'Unknown'} - {region}{isDoCapable ? '' : ' (No DO support)'}"
							onkeydown={(e) => isDoCapable && e.key === 'Enter' && onRegionClick?.(region)}
						/>
					{/each}
				</g>
			{/if}

			<!-- Traffic arcs (from all PoPs - rendered BEFORE dots so dots appear on top) -->
			<g class="traffic-arcs">
				{#each CLOUDFLARE_POPS as pop (pop.iata)}
					{@const sourcePos = projection([pop.lon, pop.lat])}
					{@const targetDc = getTargetDatacenter(pop.lat, pop.lon)}
					{@const targetPos = targetDc ? projection([targetDc.dc.lon, targetDc.dc.lat]) : null}
					{@const isActive = targetDc?.isSelected ?? false}
					{#if sourcePos && targetPos}
						{@const midX = (sourcePos[0] + targetPos[0]) / 2}
						{@const midY = (sourcePos[1] + targetPos[1]) / 2}
						{@const dist = Math.sqrt(
							Math.pow(targetPos[0] - sourcePos[0], 2) + Math.pow(targetPos[1] - sourcePos[1], 2)
						)}
						{@const curveHeight = Math.min(dist * 0.35, 80)}
						{@const arcPath = `M ${sourcePos[0]} ${sourcePos[1]} Q ${midX} ${midY - curveHeight} ${targetPos[0]} ${targetPos[1]}`}
						<!-- Use global gradients for better performance -->
						<path
							d={arcPath}
							class="arc-line"
							class:active={isActive}
							stroke={isActive ? 'url(#arc-gradient-active)' : 'url(#arc-gradient-inactive)'}
						/>
					{/if}
				{/each}
			</g>

			<!-- Cloudflare PoP points (small dots - rendered AFTER arcs so they appear on top) -->
			<g class="pop-points">
				{#each CLOUDFLARE_POPS as pop (pop.iata)}
					{@const pos = projection([pop.lon, pop.lat])}
					{@const popRegion = getRegionFromCoords(pop.lat, pop.lon)}
					{@const isInSelectedRegion = selectedRegions.includes(popRegion)}
					{#if pos}
						<circle
							cx={pos[0]}
							cy={pos[1]}
							r="1.2"
							class="pop-dot"
							class:highlight={isInSelectedRegion}
						>
							<title>{pop.iata}</title>
						</circle>
					{/if}
				{/each}
			</g>

			<!-- Primary DO datacenter points (larger, glowing) -->
			<g class="datacenters">
				{#each CF_DATACENTERS as dc (dc.city)}
					{@const pos = projection([dc.lon, dc.lat])}
					{@const isSelected = selectedRegions.includes(dc.region)}
					{#if pos}
						{#if isSelected}
							<g class="dc-group">
								<!-- Outer pulse ring -->
								<circle cx={pos[0]} cy={pos[1]} r="8" class="dc-pulse-ring" />
								<!-- Inner glow -->
								<circle cx={pos[0]} cy={pos[1]} r="4" class="dc-point active" />
								<title>{dc.city} ({dc.region.toUpperCase()})</title>
							</g>
						{:else}
							<circle cx={pos[0]} cy={pos[1]} r="2.5" class="dc-point inactive">
								<title>{dc.city} ({dc.region.toUpperCase()})</title>
							</circle>
						{/if}
					{/if}
				{/each}
			</g>
		</g>
	</svg>

	<!-- Legend -->
	<div class="map-legend">
		<div class="legend-item">
			<span class="legend-dot active"></span>
			<span>Active Region</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot inactive"></span>
			<span>Inactive</span>
		</div>
		<div class="legend-item">
			<span class="legend-line"></span>
			<span>Traffic Flow</span>
		</div>
	</div>
</div>

<style>
	.world-map-container {
		position: relative;
		width: 100%;
		min-height: 300px;
		background: var(--map-bg, #0a0a0f);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		border: 1px solid var(--map-border, #1a1a2e);
		cursor: grab;
	}

	.world-map-container.dragging {
		cursor: grabbing;
	}

	/* Grid overlay for cyberpunk effect */
	.grid-overlay {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(0, 255, 213, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 213, 0.03) 1px, transparent 1px);
		background-size: 40px 40px;
		pointer-events: none;
		z-index: 1;
	}

	.world-map-svg {
		display: block;
		width: 100%;
		height: auto;
		position: relative;
		z-index: 2;
		/* Disable D3 zoom selection box */
		outline: none;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	/* Hide any selection rectangles from D3 zoom */
	.world-map-svg :global(.selection) {
		display: none !important;
	}

	/* Country paths */
	.country-path {
		fill: var(--map-land-inactive, #1a1a2e);
		stroke: var(--map-border, #2a2a4e);
		stroke-width: 0.5px;
		cursor: pointer;
		transition:
			fill 0.3s ease,
			filter 0.3s ease;
	}

	.country-path:hover {
		fill: var(--map-land-hover, #252540);
	}

	.country-path.selected {
		fill: var(--map-land-active, #1e3a5f);
		filter: url(#glow-region);
	}

	/* Non-DO-capable regions (AFR, ME) - not clickable */
	.country-path.non-do-capable {
		cursor: inherit;
		opacity: 0.7;
	}

	.country-path.non-do-capable:hover {
		fill: var(--map-land-inactive, #1a1a2e);
	}

	/* Traffic arcs - gradient lines from all PoPs */
	.arc-line {
		fill: none;
		stroke-width: 0.6px;
		stroke-linecap: round;
		opacity: 0.7;
		transition:
			stroke-width 0.3s ease,
			opacity 0.3s ease,
			filter 0.3s ease;
	}

	.arc-line.active {
		stroke-width: 1px;
		opacity: 1;
		filter: url(#glow-arc);
	}

	/* Cloudflare PoP points - small dots */
	.pop-dot {
		fill: var(--pop-color, rgba(100, 100, 140, 0.4));
		transition: fill 0.3s ease;
	}

	.pop-dot.highlight {
		fill: var(--pop-highlight, rgba(0, 255, 213, 0.6));
	}

	/* Primary DO Datacenter points */
	.dc-point {
		transition: all 0.3s ease;
	}

	.dc-point.inactive {
		fill: var(--dc-inactive, #4a4a6a);
		opacity: 0.5;
	}

	.dc-point.active {
		fill: var(--dc-active, #00ffd5);
		filter: url(#glow-dc);
	}

	/* Pulse animation for active datacenters */
	.dc-pulse-ring {
		fill: none;
		stroke: var(--dc-active, #00ffd5);
		stroke-width: 1.5px;
		opacity: 0;
		animation: dcPulse 2s ease-out infinite;
	}

	@keyframes dcPulse {
		0% {
			r: 4;
			opacity: 0.8;
		}
		100% {
			r: 16;
			opacity: 0;
		}
	}

	/* Stagger pulse animations */
	.dc-group:nth-child(2n) .dc-pulse-ring {
		animation-delay: 0.5s;
	}
	.dc-group:nth-child(3n) .dc-pulse-ring {
		animation-delay: 1s;
	}
	.dc-group:nth-child(4n) .dc-pulse-ring {
		animation-delay: 1.5s;
	}

	/* Legend */
	.map-legend {
		position: absolute;
		bottom: 12px;
		right: 12px;
		display: flex;
		gap: 16px;
		padding: 8px 12px;
		background: rgba(10, 10, 15, 0.85);
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--map-border, #2a2a4e);
		font-size: 0.75rem;
		color: var(--text-secondary, #9ca3af);
		z-index: 3;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.legend-dot.active {
		background: var(--dc-active, #00ffd5);
		box-shadow: 0 0 8px var(--dc-active, #00ffd5);
	}

	.legend-dot.inactive {
		background: var(--dc-inactive, #4a4a6a);
	}

	.legend-line {
		width: 20px;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--arc-color, #00ffd5), transparent);
	}

	/* CSS Variables for theming */
	.world-map-container {
		--map-bg: #0a0a0f;
		--map-land-inactive: #1a1a2e;
		--map-land-active: #1e3a5f;
		--map-land-hover: #252540;
		--map-border: #2a2a4e;
		--dc-active: #00ffd5;
		--dc-inactive: #4a4a6a;
		--pop-color: rgba(100, 100, 140, 0.4);
		--pop-highlight: rgba(0, 255, 213, 0.6);
		--arc-color: rgba(0, 255, 213, 0.7);
		--arc-color-inactive: rgba(100, 100, 140, 0.2);
		/* Arc gradient colors - dark theme */
		--arc-start: rgba(0, 255, 213, 0.15);
		--arc-mid: rgba(59, 130, 246, 0.5);
		--arc-end-mid: rgba(0, 200, 220, 0.7);
		--arc-end: rgba(0, 255, 213, 0.95);
		--arc-inactive-start: rgba(100, 100, 140, 0.05);
		--arc-inactive-mid: rgba(100, 100, 140, 0.12);
		--arc-inactive-end: rgba(100, 100, 140, 0.2);
	}

	/* Light theme adjustments */
	:global([data-theme='light']) .world-map-container {
		--map-bg: #f0f4f8;
		--map-land-inactive: #d1d5db;
		--map-land-active: #93c5fd;
		--map-land-hover: #bfdbfe;
		--map-border: #9ca3af;
		--dc-active: #0ea5e9;
		--dc-inactive: #9ca3af;
		--pop-color: rgba(100, 116, 139, 0.4);
		--pop-highlight: rgba(14, 165, 233, 0.6);
		--arc-color: rgba(14, 165, 233, 0.7);
		--arc-color-inactive: rgba(100, 116, 139, 0.2);
		/* Arc gradient colors - light theme (blue tones) */
		--arc-start: rgba(14, 165, 233, 0.15);
		--arc-mid: rgba(59, 130, 246, 0.4);
		--arc-end-mid: rgba(14, 165, 233, 0.6);
		--arc-end: rgba(6, 182, 212, 0.9);
		--arc-inactive-start: rgba(100, 116, 139, 0.05);
		--arc-inactive-mid: rgba(100, 116, 139, 0.12);
		--arc-inactive-end: rgba(100, 116, 139, 0.25);
	}

	:global([data-theme='light']) .map-legend {
		background: rgba(255, 255, 255, 0.9);
		color: #374151;
	}

	:global([data-theme='light']) .grid-overlay {
		background-image:
			linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.map-legend {
			bottom: 8px;
			right: 8px;
			gap: 10px;
			padding: 6px 10px;
			font-size: 0.6875rem;
		}

		.grid-overlay {
			background-size: 30px 30px;
		}
	}

	@media (max-width: 480px) {
		.map-legend {
			flex-wrap: wrap;
			justify-content: center;
			left: 8px;
		}
	}
</style>
