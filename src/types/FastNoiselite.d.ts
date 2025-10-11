declare module 'fastnoise-lite' {
	/**
	 * FastNoise Lite is an extremely portable open source noise generation library with a large selection of noise algorithms
	 * @example
	 * // Import from npm (if you used npm)
	 *
	 * import FastNoiseLite from "fastnoise-lite";
	 *
	 * // Create and configure FastNoiseLite object
	 *
	 * let noise = new FastNoiseLite();
	 * noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
	 *
	 * // Gather noise data
	 * let noiseData = [];
	 *
	 * for (let x = 0; x < 128; x++) {
	 * 	noiseData[x] = [];
	 *
	 * 	for (let y = 0; y < 128; y++) {
	 * 		noiseData[x][y] = noise.GetNoise(x,y);
	 * 	}
	 * }
	 *
	 * // Do something with this data...
	 */
	class FastNoiseLite {
		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{Cellular: string, OpenSimplex2: string, Value: string, ValueCubic: string, Perlin: string, OpenSimplex2S: string}>}
		 */
		static NoiseType = Object.freeze({
			OpenSimplex2: 'OpenSimplex2',
			OpenSimplex2S: 'OpenSimplex2S',
			Cellular: 'Cellular',
			Perlin: 'Perlin',
			ValueCubic: 'ValueCubic',
			Value: 'Value',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{ImproveXYPlanes: string, ImproveXZPlanes: string, None: string}>}
		 */
		static RotationType3D = Object.freeze({
			None: 'None',
			ImproveXYPlanes: 'ImproveXYPlanes',
			ImproveXZPlanes: 'ImproveXZPlanes',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{FBm: string, DomainWarpIndependent: string, PingPong: string, None: string, Ridged: string, DomainWarpProgressive: string}>}
		 */
		static FractalType = Object.freeze({
			None: 'None',
			FBm: 'FBm',
			Ridged: 'Ridged',
			PingPong: 'PingPong',
			DomainWarpProgressive: 'DomainWarpProgressive',
			DomainWarpIndependent: 'DomainWarpIndependent',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{EuclideanSq: string, Euclidean: string, Hybrid: string, Manhattan: string}>}
		 */
		static CellularDistanceFunction = Object.freeze({
			Euclidean: 'Euclidean',
			EuclideanSq: 'EuclideanSq',
			Manhattan: 'Manhattan',
			Hybrid: 'Hybrid',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{Distance2Sub: string, Distance2Mul: string, Distance2Add: string, Distance2Div: string, CellValue: string, Distance: string, Distance2: string}>}
		 */
		static CellularReturnType = Object.freeze({
			CellValue: 'CellValue',
			Distance: 'Distance',
			Distance2: 'Distance2',
			Distance2Add: 'Distance2Add',
			Distance2Sub: 'Distance2Sub',
			Distance2Mul: 'Distance2Mul',
			Distance2Div: 'Distance2Div',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{BasicGrid: string, OpenSimplex2Reduced: string, OpenSimplex2: string}>}
		 */
		static DomainWarpType = Object.freeze({
			OpenSimplex2: 'OpenSimplex2',
			OpenSimplex2Reduced: 'OpenSimplex2Reduced',
			BasicGrid: 'BasicGrid',
		})

		/**
		 * @static
		 * @enum {string}
		 * @type {Readonly<{ImproveXYPlanes: string, ImproveXZPlanes: string, None: string, DefaultOpenSimplex2: string}>}
		 */
		static TransformType3D = Object.freeze({
			None: 'None',
			ImproveXYPlanes: 'ImproveXYPlanes',
			ImproveXZPlanes: 'ImproveXZPlanes',
			DefaultOpenSimplex2: 'DefaultOpenSimplex2',
		})

		constructor(seed?: number)
		/**
		 * Sets seed used for all noise types
		 */
		SetSeed(seed: number): void
		/**
		 * Sets frequency for all noise types
		 */
		SetFrequency(frequency: number): void
		/**
		 * Sets noise algorithm used for GetNoise(...)
		 */
		SetNoiseType(noiseType: FastNoiseLite.NoiseType): void
		/**
		 * Can aid in reducing directional artifacts when sampling a 2D plane in 3D
		 */
		SetRotationType3D(rotationType3D: FastNoiseLite.RotationType3D): void
		/**
		 * Sets method for combining octaves in all fractal noise types
		 */
		SetFractalType(fractalType: FastNoiseLite.FractalType): void
		/**
		 * Sets octave count for all fractal noise types
		 */
		SetFractalOctaves(octaves: number): void
		/**
		 * Sets octave lacunarity for all fractal noise types
		 */
		SetFractalLacunarity(lacunarity: number): void
		/**
		 * Sets octave gain for all fractal noise types
		 */
		SetFractalGain(gain: number): void
		/**
		 * Sets octave weighting for all none DomainWarp fratal types
		 */
		SetFractalWeightedStrength(weightedStrength: number): void
		/**
		 * Sets strength of the fractal ping pong effect
		 */
		SetFractalPingPongStrength(pingPongStrength: number): void
		/**
		 * Sets distance function used in cellular noise calculations
		 */
		SetCellularDistanceFunction(cellularDistanceFunction: FastNoiseLite.CellularDistanceFunction): void
		/**
		 * Sets return type from cellular noise calculations
		 */
		SetCellularReturnType(cellularReturnType: FastNoiseLite.CellularReturnType): void
		/**
		 * Sets the maximum distance a cellular point can move from it's grid position
		 */
		SetCellularJitter(cellularJitter: number): void
		/**
		 * Sets the warp algorithm when using DomainWarp(...)
		 */
		SetDomainWarpType(domainWarpType: FastNoiseLite.DomainWarpType): void
		/**
		 * Sets the maximum warp distance from original position when using DomainWarp(...)
		 */
		SetDomainWarpAmp(domainWarpAmp: number): void
		/**
		 * 2D/3D noise at given position using current settings
		 * @param x - X coordinate
		 * @param y - Y coordinate
		 * @param [z] - Z coordinate
		 * @returns Noise output bounded between -1...1
		 */
		GetNoise(x: number, y: number, z?: number): number
		/**
		 * 2D/3D warps the input position using current domain warp settings
		 */
		DomainWrap(coord: Vector2 | Vector3): void
		_HashR3(seed: number, xPrimed: number, yPrimed: number, zPrimed: number): number
		_ValCoordR3(seed: number, xPrimed: number, yPrimed: number, zPrimed: number): number
		_GradCoordR2(seed: number, xPrimed: number, yPrimed: number, xd: number, yd: number): number
		_GradCoordR3(seed: number, xPrimed: number, yPrimed: number, zPrimed: number, xd: number, yd: number, zd: number): number
		_SingleOpenSimplex2R2(seed: number, x: number, y: number): number
	}

	export = FastNoiseLite

}