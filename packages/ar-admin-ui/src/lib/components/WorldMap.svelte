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
	// ~310 PoP locations worldwide
	interface CloudflarePoP {
		iata: string;
		lat: number;
		lon: number;
	}

	const CLOUDFLARE_POPS: CloudflarePoP[] = [
		// North America - USA
		{ iata: 'ABQ', lat: 35.04, lon: -106.61 }, // Albuquerque
		{ iata: 'ATL', lat: 33.64, lon: -84.43 }, // Atlanta
		{ iata: 'AUS', lat: 30.19, lon: -97.67 }, // Austin
		{ iata: 'BNA', lat: 36.12, lon: -86.68 }, // Nashville
		{ iata: 'BOS', lat: 42.36, lon: -71.01 }, // Boston
		{ iata: 'BUF', lat: 42.94, lon: -78.73 }, // Buffalo
		{ iata: 'CLE', lat: 41.41, lon: -81.85 }, // Cleveland
		{ iata: 'CLT', lat: 35.21, lon: -80.94 }, // Charlotte
		{ iata: 'CMH', lat: 39.99, lon: -82.88 }, // Columbus
		{ iata: 'DEN', lat: 39.86, lon: -104.67 }, // Denver
		{ iata: 'DFW', lat: 32.9, lon: -97.04 }, // Dallas
		{ iata: 'DTW', lat: 42.21, lon: -83.35 }, // Detroit
		{ iata: 'EWR', lat: 40.69, lon: -74.17 }, // Newark
		{ iata: 'FSD', lat: 43.58, lon: -96.74 }, // Sioux Falls
		{ iata: 'HNL', lat: 21.32, lon: -157.92 }, // Honolulu
		{ iata: 'IAD', lat: 38.94, lon: -77.46 }, // Ashburn
		{ iata: 'IAH', lat: 29.98, lon: -95.34 }, // Houston
		{ iata: 'IND', lat: 39.72, lon: -86.29 }, // Indianapolis
		{ iata: 'JAX', lat: 30.49, lon: -81.69 }, // Jacksonville
		{ iata: 'LAS', lat: 36.08, lon: -115.15 }, // Las Vegas
		{ iata: 'LAX', lat: 33.94, lon: -118.41 }, // Los Angeles
		{ iata: 'MCI', lat: 39.3, lon: -94.71 }, // Kansas City
		{ iata: 'MEM', lat: 35.04, lon: -89.98 }, // Memphis
		{ iata: 'MFE', lat: 26.18, lon: -98.24 }, // McAllen
		{ iata: 'MIA', lat: 25.79, lon: -80.29 }, // Miami
		{ iata: 'MSP', lat: 44.88, lon: -93.22 }, // Minneapolis
		{ iata: 'OKC', lat: 35.39, lon: -97.6 }, // Oklahoma City
		{ iata: 'OMA', lat: 41.3, lon: -95.89 }, // Omaha
		{ iata: 'ORD', lat: 41.98, lon: -87.9 }, // Chicago
		{ iata: 'ORF', lat: 36.89, lon: -76.2 }, // Norfolk
		{ iata: 'PDX', lat: 45.59, lon: -122.6 }, // Portland
		{ iata: 'PHL', lat: 39.87, lon: -75.24 }, // Philadelphia
		{ iata: 'PHX', lat: 33.43, lon: -112.01 }, // Phoenix
		{ iata: 'PIT', lat: 40.49, lon: -80.23 }, // Pittsburgh
		{ iata: 'RDU', lat: 35.88, lon: -78.79 }, // Durham
		{ iata: 'RIC', lat: 37.51, lon: -77.32 }, // Richmond
		{ iata: 'SAN', lat: 32.73, lon: -117.19 }, // San Diego
		{ iata: 'SAT', lat: 29.53, lon: -98.47 }, // San Antonio
		{ iata: 'SEA', lat: 47.45, lon: -122.31 }, // Seattle
		{ iata: 'SFO', lat: 37.62, lon: -122.38 }, // San Francisco
		{ iata: 'SJC', lat: 37.36, lon: -121.93 }, // San Jose
		{ iata: 'SLC', lat: 40.79, lon: -111.98 }, // Salt Lake City
		{ iata: 'SMF', lat: 38.7, lon: -121.59 }, // Sacramento
		{ iata: 'STL', lat: 38.75, lon: -90.37 }, // St. Louis
		{ iata: 'TLH', lat: 30.4, lon: -84.35 }, // Tallahassee
		{ iata: 'TPA', lat: 27.98, lon: -82.53 }, // Tampa
		// North America - Canada
		{ iata: 'YHZ', lat: 44.88, lon: -63.51 }, // Halifax
		{ iata: 'YOW', lat: 45.32, lon: -75.67 }, // Ottawa
		{ iata: 'YUL', lat: 45.47, lon: -73.74 }, // Montreal
		{ iata: 'YVR', lat: 49.19, lon: -123.18 }, // Vancouver
		{ iata: 'YWG', lat: 49.91, lon: -97.24 }, // Winnipeg
		{ iata: 'YXE', lat: 52.17, lon: -106.7 }, // Saskatoon
		{ iata: 'YYC', lat: 51.11, lon: -114.01 }, // Calgary
		{ iata: 'YYZ', lat: 43.68, lon: -79.63 }, // Toronto
		// Latin America - Mexico
		{ iata: 'GDL', lat: 20.52, lon: -103.31 }, // Guadalajara
		{ iata: 'MEX', lat: 19.44, lon: -99.07 }, // Mexico City
		{ iata: 'QRO', lat: 20.62, lon: -100.19 }, // Queretaro
		// Latin America - Brazil
		{ iata: 'ARU', lat: -21.14, lon: -50.42 }, // Aracatuba
		{ iata: 'BEL', lat: -1.38, lon: -48.48 }, // Belem
		{ iata: 'BNU', lat: -26.83, lon: -49.09 }, // Blumenau
		{ iata: 'BSB', lat: -15.87, lon: -47.92 }, // Brasilia
		{ iata: 'CAW', lat: -21.7, lon: -41.3 }, // Campos
		{ iata: 'CFC', lat: -26.79, lon: -50.94 }, // Cacador
		{ iata: 'CGB', lat: -15.65, lon: -56.12 }, // Cuiaba
		{ iata: 'CNF', lat: -19.62, lon: -43.97 }, // Belo Horizonte
		{ iata: 'CWB', lat: -25.53, lon: -49.17 }, // Curitiba
		{ iata: 'FLN', lat: -27.67, lon: -48.55 }, // Florianopolis
		{ iata: 'FOR', lat: -3.78, lon: -38.53 }, // Fortaleza
		{ iata: 'GIG', lat: -22.81, lon: -43.25 }, // Rio de Janeiro
		{ iata: 'GRU', lat: -23.43, lon: -46.47 }, // Sao Paulo
		{ iata: 'GYN', lat: -16.63, lon: -49.22 }, // Goiania
		{ iata: 'ITJ', lat: -26.88, lon: -48.65 }, // Itajai
		{ iata: 'JDO', lat: -7.22, lon: -39.27 }, // Juazeiro
		{ iata: 'JOI', lat: -26.22, lon: -48.8 }, // Joinville
		{ iata: 'MAO', lat: -3.04, lon: -60.05 }, // Manaus
		{ iata: 'NVT', lat: -26.88, lon: -49.23 }, // Timbo
		{ iata: 'PMW', lat: -10.29, lon: -48.36 }, // Palmas
		{ iata: 'POA', lat: -29.99, lon: -51.17 }, // Porto Alegre
		{ iata: 'QWJ', lat: -22.74, lon: -47.33 }, // Americana
		{ iata: 'RAO', lat: -21.13, lon: -47.77 }, // Ribeirao Preto
		{ iata: 'REC', lat: -8.13, lon: -34.92 }, // Recife
		{ iata: 'SJK', lat: -23.23, lon: -45.86 }, // Sao Jose Campos
		{ iata: 'SJP', lat: -20.82, lon: -49.4 }, // Sao Jose Rio Preto
		{ iata: 'SOD', lat: -23.48, lon: -47.49 }, // Sorocaba
		{ iata: 'SSA', lat: -12.91, lon: -38.33 }, // Salvador
		{ iata: 'UDI', lat: -18.88, lon: -48.23 }, // Uberlandia
		{ iata: 'VCP', lat: -23.01, lon: -47.13 }, // Campinas
		{ iata: 'VIX', lat: -20.26, lon: -40.29 }, // Vitoria
		{ iata: 'XAP', lat: -27.13, lon: -52.66 }, // Chapeco
		// Latin America - Others
		{ iata: 'ARI', lat: -18.35, lon: -70.34 }, // Arica, Chile
		{ iata: 'ASU', lat: -25.24, lon: -57.52 }, // Asuncion, Paraguay
		{ iata: 'BAQ', lat: 10.89, lon: -74.78 }, // Barranquilla, Colombia
		{ iata: 'BOG', lat: 4.7, lon: -74.15 }, // Bogota, Colombia
		{ iata: 'CCP', lat: -36.77, lon: -73.06 }, // Concepcion, Chile
		{ iata: 'CLO', lat: 3.54, lon: -76.38 }, // Cali, Colombia
		{ iata: 'COR', lat: -31.32, lon: -64.21 }, // Cordoba, Argentina
		{ iata: 'EZE', lat: -34.82, lon: -58.54 }, // Buenos Aires
		{ iata: 'GEO', lat: 6.5, lon: -58.25 }, // Georgetown, Guyana
		{ iata: 'GUA', lat: 14.58, lon: -90.53 }, // Guatemala City
		{ iata: 'GYE', lat: -2.16, lon: -79.88 }, // Guayaquil, Ecuador
		{ iata: 'LIM', lat: -12.02, lon: -77.11 }, // Lima, Peru
		{ iata: 'LPB', lat: -16.51, lon: -68.19 }, // La Paz, Bolivia
		{ iata: 'MDE', lat: 6.16, lon: -75.43 }, // Medellin, Colombia
		{ iata: 'NQN', lat: -38.95, lon: -68.16 }, // Neuquen, Argentina
		{ iata: 'PBM', lat: 5.45, lon: -55.19 }, // Paramaribo, Suriname
		{ iata: 'PTY', lat: 9.07, lon: -79.38 }, // Panama City
		{ iata: 'SCL', lat: -33.39, lon: -70.79 }, // Santiago, Chile
		{ iata: 'SJO', lat: 9.99, lon: -84.21 }, // San Jose, Costa Rica
		{ iata: 'UIO', lat: -0.13, lon: -78.36 }, // Quito, Ecuador
		// Caribbean
		{ iata: 'BGI', lat: 13.07, lon: -59.49 }, // Bridgetown, Barbados
		{ iata: 'GND', lat: 12.0, lon: -61.79 }, // Grenada
		{ iata: 'KIN', lat: 17.94, lon: -76.79 }, // Kingston, Jamaica
		{ iata: 'POS', lat: 10.6, lon: -61.34 }, // Port of Spain
		{ iata: 'SDQ', lat: 18.43, lon: -69.67 }, // Santo Domingo
		{ iata: 'SJU', lat: 18.44, lon: -66.0 }, // San Juan, Puerto Rico
		{ iata: 'STI', lat: 19.41, lon: -70.6 }, // Santiago, DR
		// Europe - Western
		{ iata: 'AMS', lat: 52.31, lon: 4.77 }, // Amsterdam
		{ iata: 'BCN', lat: 41.3, lon: 2.08 }, // Barcelona
		{ iata: 'BOD', lat: 44.83, lon: -0.72 }, // Bordeaux
		{ iata: 'BRU', lat: 50.9, lon: 4.48 }, // Brussels
		{ iata: 'CDG', lat: 49.01, lon: 2.55 }, // Paris
		{ iata: 'DUB', lat: 53.42, lon: -6.27 }, // Dublin
		{ iata: 'DUS', lat: 51.29, lon: 6.77 }, // Dusseldorf
		{ iata: 'EDI', lat: 55.95, lon: -3.37 }, // Edinburgh
		{ iata: 'FCO', lat: 41.8, lon: 12.25 }, // Rome
		{ iata: 'FRA', lat: 50.03, lon: 8.57 }, // Frankfurt
		{ iata: 'GVA', lat: 46.24, lon: 6.11 }, // Geneva
		{ iata: 'HAM', lat: 53.63, lon: 10.01 }, // Hamburg
		{ iata: 'LHR', lat: 51.47, lon: -0.46 }, // London
		{ iata: 'LIS', lat: 38.77, lon: -9.13 }, // Lisbon
		{ iata: 'LUX', lat: 49.63, lon: 6.21 }, // Luxembourg
		{ iata: 'LYS', lat: 45.73, lon: 5.08 }, // Lyon
		{ iata: 'MAD', lat: 40.47, lon: -3.56 }, // Madrid
		{ iata: 'MAN', lat: 53.35, lon: -2.28 }, // Manchester
		{ iata: 'MRS', lat: 43.44, lon: 5.22 }, // Marseille
		{ iata: 'MUC', lat: 48.35, lon: 11.79 }, // Munich
		{ iata: 'MXP', lat: 45.63, lon: 8.72 }, // Milan
		{ iata: 'ORK', lat: 51.84, lon: -8.49 }, // Cork
		{ iata: 'PMO', lat: 38.18, lon: 13.1 }, // Palermo
		{ iata: 'STR', lat: 48.69, lon: 9.22 }, // Stuttgart
		{ iata: 'TXL', lat: 52.56, lon: 13.29 }, // Berlin
		{ iata: 'VIE', lat: 48.11, lon: 16.57 }, // Vienna
		{ iata: 'ZRH', lat: 47.46, lon: 8.55 }, // Zurich
		// Europe - Nordic
		{ iata: 'ARN', lat: 59.65, lon: 17.94 }, // Stockholm
		{ iata: 'CPH', lat: 55.62, lon: 12.66 }, // Copenhagen
		{ iata: 'GOT', lat: 57.66, lon: 12.29 }, // Gothenburg
		{ iata: 'HEL', lat: 60.32, lon: 24.95 }, // Helsinki
		{ iata: 'KEF', lat: 63.99, lon: -22.62 }, // Reykjavik
		{ iata: 'OSL', lat: 60.19, lon: 11.1 }, // Oslo
		// Europe - Eastern
		{ iata: 'ATH', lat: 37.94, lon: 23.94 }, // Athens
		{ iata: 'BEG', lat: 44.82, lon: 20.29 }, // Belgrade
		{ iata: 'BTS', lat: 48.17, lon: 17.21 }, // Bratislava
		{ iata: 'BUD', lat: 47.44, lon: 19.26 }, // Budapest
		{ iata: 'KBP', lat: 50.34, lon: 30.89 }, // Kyiv
		{ iata: 'OTP', lat: 44.57, lon: 26.08 }, // Bucharest
		{ iata: 'PRG', lat: 50.1, lon: 14.26 }, // Prague
		{ iata: 'RIX', lat: 56.92, lon: 23.97 }, // Riga
		{ iata: 'SKG', lat: 40.52, lon: 22.97 }, // Thessaloniki
		{ iata: 'SKP', lat: 41.96, lon: 21.62 }, // Skopje
		{ iata: 'SOF', lat: 42.7, lon: 23.32 }, // Sofia
		{ iata: 'TIA', lat: 41.41, lon: 19.72 }, // Tirana
		{ iata: 'TLL', lat: 59.41, lon: 24.83 }, // Tallinn
		{ iata: 'VNO', lat: 54.64, lon: 25.29 }, // Vilnius
		{ iata: 'WAW', lat: 52.17, lon: 20.97 }, // Warsaw
		{ iata: 'WRO', lat: 51.1, lon: 16.89 }, // Wroclaw
		{ iata: 'ZAG', lat: 45.74, lon: 16.07 }, // Zagreb
		// Europe - Russia
		{ iata: 'DME', lat: 55.41, lon: 37.91 }, // Moscow
		{ iata: 'KJA', lat: 56.17, lon: 92.49 }, // Krasnoyarsk
		{ iata: 'LED', lat: 59.8, lon: 30.26 }, // St. Petersburg
		{ iata: 'SVX', lat: 56.74, lon: 60.8 }, // Yekaterinburg
		// Middle East
		{ iata: 'AMM', lat: 31.72, lon: 35.99 }, // Amman
		{ iata: 'BAH', lat: 26.27, lon: 50.64 }, // Bahrain
		{ iata: 'BEY', lat: 33.82, lon: 35.49 }, // Beirut
		{ iata: 'BGW', lat: 33.26, lon: 44.23 }, // Baghdad
		{ iata: 'BSR', lat: 30.55, lon: 47.66 }, // Basra
		{ iata: 'DMM', lat: 26.47, lon: 49.8 }, // Dammam
		{ iata: 'DOH', lat: 25.26, lon: 51.57 }, // Doha
		{ iata: 'DXB', lat: 25.25, lon: 55.36 }, // Dubai
		{ iata: 'EBL', lat: 36.24, lon: 43.96 }, // Erbil
		{ iata: 'IST', lat: 41.27, lon: 28.75 }, // Istanbul
		{ iata: 'ISU', lat: 35.56, lon: 45.32 }, // Sulaymaniyah
		{ iata: 'JED', lat: 21.68, lon: 39.16 }, // Jeddah
		{ iata: 'KWI', lat: 29.23, lon: 47.97 }, // Kuwait
		{ iata: 'MCT', lat: 23.59, lon: 58.28 }, // Muscat
		{ iata: 'NJF', lat: 31.99, lon: 44.4 }, // Najaf
		{ iata: 'RUH', lat: 24.96, lon: 46.7 }, // Riyadh
		{ iata: 'TLV', lat: 32.01, lon: 34.88 }, // Tel Aviv
		{ iata: 'XNH', lat: 31.05, lon: 46.22 }, // Nasiriyah
		{ iata: 'ZDM', lat: 31.9, lon: 35.2 }, // Ramallah
		// Africa
		{ iata: 'AAE', lat: 36.82, lon: 7.81 }, // Annaba, Algeria
		{ iata: 'ABJ', lat: 5.26, lon: -3.93 }, // Abidjan
		{ iata: 'ACC', lat: 5.61, lon: -0.17 }, // Accra
		{ iata: 'ADD', lat: 8.98, lon: 38.8 }, // Addis Ababa
		{ iata: 'ALG', lat: 36.69, lon: 3.22 }, // Algiers
		{ iata: 'ASK', lat: 6.9, lon: -5.37 }, // Yamoussoukro
		{ iata: 'CAI', lat: 30.11, lon: 31.4 }, // Cairo
		{ iata: 'CPT', lat: -33.97, lon: 18.6 }, // Cape Town
		{ iata: 'CZL', lat: 36.29, lon: 6.62 }, // Constantine
		{ iata: 'DAR', lat: -6.88, lon: 39.2 }, // Dar es Salaam
		{ iata: 'DKR', lat: 14.74, lon: -17.49 }, // Dakar
		{ iata: 'DUR', lat: -29.97, lon: 30.95 }, // Durban
		{ iata: 'EBB', lat: 0.04, lon: 32.44 }, // Kampala
		{ iata: 'FIH', lat: -4.39, lon: 15.44 }, // Kinshasa
		{ iata: 'GBE', lat: -24.56, lon: 25.92 }, // Gaborone
		{ iata: 'HRE', lat: -17.93, lon: 31.09 }, // Harare
		{ iata: 'JNB', lat: -26.14, lon: 28.25 }, // Johannesburg
		{ iata: 'KGL', lat: -1.97, lon: 30.14 }, // Kigali
		{ iata: 'LAD', lat: -8.86, lon: 13.23 }, // Luanda
		{ iata: 'LLW', lat: -13.79, lon: 33.78 }, // Lilongwe
		{ iata: 'LOS', lat: 6.58, lon: 3.32 }, // Lagos
		{ iata: 'LUN', lat: -15.33, lon: 28.45 }, // Lusaka
		{ iata: 'MBA', lat: -4.03, lon: 39.59 }, // Mombasa
		{ iata: 'MPM', lat: -25.92, lon: 32.57 }, // Maputo
		{ iata: 'NBO', lat: -1.32, lon: 36.93 }, // Nairobi
		{ iata: 'ORN', lat: 35.62, lon: -0.62 }, // Oran
		{ iata: 'OUA', lat: 12.35, lon: -1.51 }, // Ouagadougou
		{ iata: 'TNR', lat: -18.8, lon: 47.48 }, // Antananarivo
		{ iata: 'TUN', lat: 36.85, lon: 10.23 }, // Tunis
		{ iata: 'WDH', lat: -22.48, lon: 17.47 }, // Windhoek
		// Asia - Japan
		{ iata: 'FUK', lat: 33.59, lon: 130.45 }, // Fukuoka
		{ iata: 'KIX', lat: 34.43, lon: 135.24 }, // Osaka
		{ iata: 'NRT', lat: 35.76, lon: 140.39 }, // Tokyo
		{ iata: 'OKA', lat: 26.2, lon: 127.65 }, // Naha/Okinawa
		// Asia - China
		{ iata: 'BHY', lat: 21.54, lon: 109.29 }, // Beihai
		{ iata: 'CAN', lat: 23.39, lon: 113.3 }, // Guangzhou
		{ iata: 'CGD', lat: 29.07, lon: 111.64 }, // Changde
		{ iata: 'CGO', lat: 34.52, lon: 113.84 }, // Zhengzhou
		{ iata: 'CKG', lat: 29.72, lon: 106.64 }, // Chongqing
		{ iata: 'CSX', lat: 28.19, lon: 113.22 }, // Changsha
		{ iata: 'CTU', lat: 30.58, lon: 103.95 }, // Chengdu
		{ iata: 'CZX', lat: 31.92, lon: 119.78 }, // Changzhou
		{ iata: 'DLC', lat: 38.97, lon: 121.54 }, // Dalian
		{ iata: 'FOC', lat: 25.93, lon: 119.66 }, // Fuzhou
		{ iata: 'FUO', lat: 23.08, lon: 113.07 }, // Foshan
		{ iata: 'HAK', lat: 19.93, lon: 110.46 }, // Haikou
		{ iata: 'HFE', lat: 31.78, lon: 117.3 }, // Hefei
		{ iata: 'HGH', lat: 30.23, lon: 120.43 }, // Hangzhou
		{ iata: 'HYN', lat: 28.56, lon: 121.43 }, // Taizhou
		{ iata: 'JXG', lat: 30.76, lon: 120.76 }, // Jiaxing
		{ iata: 'KHN', lat: 28.86, lon: 115.9 }, // Nanchang
		{ iata: 'KMG', lat: 24.99, lon: 102.74 }, // Kunming
		{ iata: 'KWE', lat: 26.54, lon: 106.8 }, // Guiyang
		{ iata: 'LHW', lat: 36.52, lon: 103.62 }, // Lanzhou
		{ iata: 'NNG', lat: 22.61, lon: 108.17 }, // Nanning
		{ iata: 'PKX', lat: 39.51, lon: 116.41 }, // Beijing Daxing
		{ iata: 'SHA', lat: 31.2, lon: 121.34 }, // Shanghai
		{ iata: 'SJW', lat: 38.28, lon: 114.7 }, // Shijiazhuang
		{ iata: 'SZX', lat: 22.64, lon: 113.81 }, // Shenzhen
		{ iata: 'TAO', lat: 36.27, lon: 120.37 }, // Qingdao
		{ iata: 'TEN', lat: 27.88, lon: 109.31 }, // Tongren
		{ iata: 'TNA', lat: 36.86, lon: 117.22 }, // Jinan
		{ iata: 'TSN', lat: 39.12, lon: 117.35 }, // Tianjin
		{ iata: 'TYN', lat: 37.75, lon: 112.63 }, // Taiyuan
		{ iata: 'WHU', lat: 31.39, lon: 118.41 }, // Wuhu
		{ iata: 'XFN', lat: 32.15, lon: 112.29 }, // Xiangyang
		{ iata: 'XIY', lat: 34.44, lon: 108.75 }, // Xi'an
		{ iata: 'XNN', lat: 36.53, lon: 102.04 }, // Xining
		{ iata: 'ZGN', lat: 22.52, lon: 113.37 }, // Zhongshan
		// Asia - South Korea
		{ iata: 'ICN', lat: 37.46, lon: 126.44 }, // Seoul/Incheon
		// Asia - Taiwan/HK/Macau
		{ iata: 'HKG', lat: 22.31, lon: 113.91 }, // Hong Kong
		{ iata: 'KHH', lat: 22.58, lon: 120.35 }, // Kaohsiung
		{ iata: 'MFM', lat: 22.15, lon: 113.59 }, // Macau
		{ iata: 'TPE', lat: 25.08, lon: 121.23 }, // Taipei
		// Asia - Southeast
		{ iata: 'BKK', lat: 13.69, lon: 100.75 }, // Bangkok
		{ iata: 'BWN', lat: 4.94, lon: 114.93 }, // Brunei
		{ iata: 'CEB', lat: 10.31, lon: 123.98 }, // Cebu
		{ iata: 'CGK', lat: -6.13, lon: 106.66 }, // Jakarta
		{ iata: 'CGY', lat: 8.41, lon: 124.61 }, // Cagayan de Oro
		{ iata: 'CNX', lat: 18.77, lon: 98.96 }, // Chiang Mai
		{ iata: 'CRK', lat: 15.19, lon: 120.56 }, // Clark/Tarlac
		{ iata: 'DAD', lat: 16.04, lon: 108.2 }, // Da Nang
		{ iata: 'DPS', lat: -8.75, lon: 115.17 }, // Bali/Denpasar
		{ iata: 'HAN', lat: 21.22, lon: 105.81 }, // Hanoi
		{ iata: 'JHB', lat: 1.64, lon: 103.67 }, // Johor Bahru
		{ iata: 'JOG', lat: -7.79, lon: 110.43 }, // Yogyakarta
		{ iata: 'KCH', lat: 1.48, lon: 110.35 }, // Kuching
		{ iata: 'KUL', lat: 2.75, lon: 101.71 }, // Kuala Lumpur
		{ iata: 'MLG', lat: -7.93, lon: 112.71 }, // Malang
		{ iata: 'MNL', lat: 14.51, lon: 121.02 }, // Manila
		{ iata: 'PNH', lat: 11.55, lon: 104.84 }, // Phnom Penh
		{ iata: 'SGN', lat: 10.82, lon: 106.65 }, // Ho Chi Minh City
		{ iata: 'SIN', lat: 1.36, lon: 103.99 }, // Singapore
		{ iata: 'URT', lat: 9.13, lon: 99.14 }, // Surat Thani
		{ iata: 'VTE', lat: 17.99, lon: 102.56 }, // Vientiane
		// Asia - South
		{ iata: 'AGR', lat: 27.16, lon: 77.96 }, // Agra
		{ iata: 'AMD', lat: 23.07, lon: 72.63 }, // Ahmedabad
		{ iata: 'BBI', lat: 20.24, lon: 85.82 }, // Bhubaneswar
		{ iata: 'BLR', lat: 13.2, lon: 77.71 }, // Bangalore
		{ iata: 'BOM', lat: 19.09, lon: 72.87 }, // Mumbai
		{ iata: 'CCU', lat: 22.65, lon: 88.45 }, // Kolkata
		{ iata: 'CJB', lat: 11.03, lon: 77.04 }, // Coimbatore
		{ iata: 'CMB', lat: 7.18, lon: 79.88 }, // Colombo
		{ iata: 'CNN', lat: 11.92, lon: 75.55 }, // Kannur
		{ iata: 'COK', lat: 10.15, lon: 76.4 }, // Kochi
		{ iata: 'DAC', lat: 23.84, lon: 90.4 }, // Dhaka
		{ iata: 'DEL', lat: 28.56, lon: 77.1 }, // Delhi
		{ iata: 'HYD', lat: 17.23, lon: 78.43 }, // Hyderabad
		{ iata: 'ISB', lat: 33.62, lon: 73.1 }, // Islamabad
		{ iata: 'IXC', lat: 30.67, lon: 76.79 }, // Chandigarh
		{ iata: 'JSR', lat: 23.18, lon: 89.16 }, // Jashore
		{ iata: 'KHI', lat: 24.91, lon: 67.16 }, // Karachi
		{ iata: 'KNU', lat: 26.44, lon: 80.37 }, // Kanpur
		{ iata: 'KTM', lat: 27.7, lon: 85.36 }, // Kathmandu
		{ iata: 'LHE', lat: 31.52, lon: 74.4 }, // Lahore
		{ iata: 'MAA', lat: 12.99, lon: 80.17 }, // Chennai
		{ iata: 'MLE', lat: 4.19, lon: 73.53 }, // Male, Maldives
		{ iata: 'NAG', lat: 21.09, lon: 79.05 }, // Nagpur
		{ iata: 'PAT', lat: 25.59, lon: 85.09 }, // Patna
		{ iata: 'PBH', lat: 27.4, lon: 89.42 }, // Thimphu, Bhutan
		// Asia - Central
		{ iata: 'AKX', lat: 50.25, lon: 57.21 }, // Aktobe
		{ iata: 'ALA', lat: 43.35, lon: 77.04 }, // Almaty
		{ iata: 'EVN', lat: 40.15, lon: 44.4 }, // Yerevan
		{ iata: 'FRU', lat: 43.06, lon: 74.48 }, // Bishkek
		{ iata: 'GYD', lat: 40.47, lon: 50.05 }, // Baku
		{ iata: 'LLK', lat: 38.75, lon: 48.85 }, // Astara
		{ iata: 'NQZ', lat: 51.02, lon: 71.47 }, // Astana
		{ iata: 'TAS', lat: 41.26, lon: 69.28 }, // Tashkent
		{ iata: 'TBS', lat: 41.67, lon: 44.95 }, // Tbilisi
		{ iata: 'ULN', lat: 47.84, lon: 106.77 }, // Ulaanbaatar
		// Oceania
		{ iata: 'ADL', lat: -34.94, lon: 138.53 }, // Adelaide
		{ iata: 'AKL', lat: -37.01, lon: 174.79 }, // Auckland
		{ iata: 'BNE', lat: -27.38, lon: 153.12 }, // Brisbane
		{ iata: 'CBR', lat: -35.31, lon: 149.19 }, // Canberra
		{ iata: 'CHC', lat: -43.49, lon: 172.53 }, // Christchurch
		{ iata: 'GUM', lat: 13.48, lon: 144.8 }, // Guam
		{ iata: 'HBA', lat: -42.84, lon: 147.51 }, // Hobart
		{ iata: 'MEL', lat: -37.67, lon: 144.84 }, // Melbourne
		{ iata: 'NOU', lat: -22.01, lon: 166.21 }, // Noumea
		{ iata: 'PER', lat: -31.94, lon: 115.97 }, // Perth
		{ iata: 'PPT', lat: -17.56, lon: -149.61 }, // Tahiti
		{ iata: 'SUV', lat: -18.04, lon: 178.56 }, // Suva, Fiji
		{ iata: 'SYD', lat: -33.95, lon: 151.18 }, // Sydney
		// Other
		{ iata: 'ANC', lat: 61.17, lon: -150.0 }, // Anchorage
		{ iata: 'BGR', lat: 44.81, lon: -68.83 }, // Bangor
		{ iata: 'CGP', lat: 22.25, lon: 91.81 }, // Chittagong
		{ iata: 'JIB', lat: 11.55, lon: 43.16 }, // Djibouti
		{ iata: 'KIV', lat: 46.93, lon: 28.93 }, // Chisinau
		{ iata: 'LCA', lat: 34.88, lon: 33.63 }, // Nicosia/Cyprus
		{ iata: 'MLA', lat: 35.86, lon: 14.48 }, // Malta
		{ iata: 'MRU', lat: -20.43, lon: 57.68 }, // Mauritius
		{ iata: 'MSQ', lat: 53.88, lon: 28.03 }, // Minsk
		{ iata: 'RUN', lat: -20.89, lon: 55.51 }, // Reunion
		{ iata: 'SAP', lat: 15.45, lon: -87.92 }, // San Pedro Sula
		{ iata: 'TGU', lat: 14.06, lon: -87.22 } // Tegucigalpa
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

	// Normalize transform.x for infinite loop (modulo width)
	// Returns value between -width and 0 for seamless wrapping
	let normalizedX = $derived.by(() => {
		if (width <= 0) return 0;
		// Use modulo to create loop effect
		let x = transform.x % width;
		// Ensure x is in range [-width, 0] for consistent rendering
		if (x > 0) x -= width;
		return x;
	});

	// Offsets for the 3 map copies (left, center, right)
	const MAP_OFFSETS = [-1, 0, 1];

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

		// Set up D3 zoom/pan behavior (horizontal pan only, with loop)
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([1, 1]) // Disable zoom, pan only
			.on('start', () => {
				isDragging = true;
			})
			.on('zoom', (event) => {
				// Only allow horizontal panning (lock Y axis)
				transform = { x: event.transform.x, y: 0, k: event.transform.k };
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

			<!-- Arc glow -->
			<filter id="glow-arc" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="2" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>

		</defs>

		<!-- Map content with infinite horizontal loop (3 copies: left, center, right) -->
		{#each MAP_OFFSETS as offset (offset)}
			<g class="map-content" transform="translate({normalizedX + offset * width}, 0)">
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
					{#each CLOUDFLARE_POPS as pop, i (pop.iata)}
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
							{@const gradientId = `arc-grad-${offset}-${i}`}
							{@const mapOffset = normalizedX + offset * width}
							<!-- Gradient with gradientTransform to follow map panning -->
							<defs>
								<linearGradient
									id={gradientId}
									gradientUnits="userSpaceOnUse"
									x1={sourcePos[0]}
									y1={sourcePos[1]}
									x2={targetPos[0]}
									y2={targetPos[1]}
									gradientTransform={`translate(${mapOffset}, 0)`}
								>
									<stop
										offset="0%"
										stop-color={isActive ? 'rgba(0, 255, 213, 0.1)' : 'rgba(100, 100, 140, 0.05)'}
									/>
									<stop
										offset="40%"
										stop-color={isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 100, 140, 0.15)'}
									/>
									<stop
										offset="100%"
										stop-color={isActive ? 'rgba(0, 255, 213, 0.9)' : 'rgba(100, 100, 140, 0.3)'}
									/>
								</linearGradient>
							</defs>
							<path d={arcPath} class="arc-line" class:active={isActive} stroke="url(#{gradientId})" />
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
		{/each}
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

	/* Traffic arcs - gradient lines from all PoPs (stroke set via inline gradient URL) */
	.arc-line {
		fill: none;
		/* Fallback stroke color if gradient fails */
		stroke: rgba(100, 100, 140, 0.25);
		stroke-width: 0.4px;
		stroke-linecap: round;
		transition:
			stroke 0.4s ease,
			stroke-width 0.4s ease,
			opacity 0.4s ease,
			filter 0.4s ease;
	}

	.arc-line.active {
		/* Fallback stroke color if gradient fails */
		stroke: rgba(0, 200, 180, 0.7);
		stroke-width: 0.6px;
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
