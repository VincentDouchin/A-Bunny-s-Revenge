import type { Object3D, Vec2, Vector4Like } from 'three'
import type { InstanceGenerator, InstanceHandle } from '@/global/assetLoaders'
import FastNoiseLite from 'fastnoise-lite'
import { Euler, Group, PlaneGeometry, Vector3, Vector4 } from 'three'

import { canvasToGrid, instanceMesh } from '@/global/assetLoaders'
import { getSize } from '@/lib/models'

export const setDisplacement = (size: Vec2, canvas: HTMLCanvasElement, waterCanvas: HTMLCanvasElement | null, heightOffset: number) => {
	const canvasScale = 1
	const geo = new PlaneGeometry(size.x, size.y, Math.floor(size.x * canvasScale) - 1, Math.floor(size.y * canvasScale) - 1)
	const width = geo.parameters.widthSegments + 1
	const height = geo.parameters.heightSegments + 1
	const positionAttribute = geo.getAttribute('position')
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!

	const imageData = ctx.getImageData(0, 0, width, height).data

	const waterCtx = waterCanvas?.getContext('2d', { willReadFrequently: true })
	const waterData = waterCtx?.getImageData(0, 0, width, height).data
	for (let i = 0; i < (width * height * 4); i += 4) {
		const index = i / 4
		const x = index % width
		const y = Math.floor(index / width) + 1
		if (waterData && waterData[i - 1]) {
			positionAttribute.setZ(width * y + x, 0)
		} else {
			let displacementVal = 0.5 + imageData[i] / 255 / 2
			displacementVal *= heightOffset
			positionAttribute.setZ(width * y + x, displacementVal)
		}
	}
	positionAttribute.needsUpdate = true
	geo.computeVertexNormals()
	geo.computeTangents()
	return geo
}

const spawnFromCanvas = <T>(displacementMap: HTMLCanvasElement, image: HTMLCanvasElement, scale: number, heightDelta: number, fn: (val: Vector4Like, x: number, y: number, z: number,) => T | undefined) => {
	const heightGrid = canvasToGrid(displacementMap)
	const grid = canvasToGrid(image)
	const result: T[] = []
	for (let y = 0; y < grid.length; y += scale) {
		const treeRow = grid[y]
		for (let x = 0; x < treeRow.length; x += scale) {
			const height = heightGrid[y][x] ?? new Vector4()
			const displacement = height.x / 255 * heightDelta / 2 / scale
			const val = treeRow[x]
			const res = fn(val, x, y, displacement)
			if (res) {
				result.push(res)
			}
		}
	}
	return result
}
const processGenerators = (generators: InstanceGenerator[]) => {
	const group = new Group()
	for (const generator of generators) {
		group.add(generator.process())
	}
	return group
}

export const getTrees = (models: Object3D[], displacement: HTMLCanvasElement, treeMap: HTMLCanvasElement, gridSize: number, HEIGHT: number) => {
	const trees = models.map(x => [instanceMesh(x, true), getSize(x)] as const)
	const treesInstances: InstanceHandle[] = []
	const noise = new FastNoiseLite(0)
	noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
	const instanceMap = new Map<Vec2, InstanceHandle>()
	const process = () => processGenerators(trees.map(x => x[0]))
	const instances = spawnFromCanvas(displacement, treeMap, gridSize, HEIGHT, (val, x, y, displacement) => {
		if (val.x === 255 || val.y === 255) {
			const position = new Vector3(
				(x - treeMap.width / 2) / gridSize + noise.GetNoise(x, y, y),
				displacement,
				(y - treeMap.height / 2) / gridSize + noise.GetNoise(y, x, x),
			).multiplyScalar(gridSize)
			const sizeFactor = 3 + (1 * Math.abs(noise.GetNoise(x, y, x)))
			const [generator, modelSize] = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const instanceHandle = generator.addAt(position, sizeFactor, new Euler(0, noise.GetNoise(x, y, x), 0))
			if (val.x === 255) treesInstances.push(instanceHandle)
			instanceMap.set(position, instanceHandle)
			const size = modelSize.multiplyScalar(sizeFactor)
			return { position, instanceHandle, size }
		}
	})
	return {
		process,
		instances,
	}
}
export const getGrass = (grassModels: Object3D[], flowerModels: Object3D[], displacement: HTMLCanvasElement, grassMap: HTMLCanvasElement, gridSize: number, HEIGHT: number) => {
	const grass = grassModels.map(x => instanceMesh(x, true))

	const flowers = flowerModels.map(x => instanceMesh(x, true))
	const createNoise = (seed: number) => {
		const noise = new FastNoiseLite(seed)
		noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
		return (x: number, y: number) => {
			return noise.GetNoise(x, y)
		}
	}

	const instances = new Map<InstanceHandle, Vec2>()
	const process = () => processGenerators([...grass, ...flowers])
	const instanceHandles = spawnFromCanvas(displacement, grassMap, gridSize, HEIGHT, (val, x, y, displacement) => {
		if (val.y !== 255) return
		const noise = createNoise(0)
		const s = noise(x, y)
		const noise2 = createNoise(s)
		const noiseX = createNoise(s * 38)
		const noiseY = createNoise(s * 76)
		const noiseFlower = createNoise(s * 52)
		const noiseFlower2 = createNoise(s * 93)
		const n = noise(x, y)
		const n2 = noise2(x, y)
		const nX = noiseX(x, y)
		const nY = noiseY(x, y)
		const nF = noiseFlower(x, y)
		const nF2 = noiseFlower2(x, y)

		const position = new Vector3(
			(x - grassMap.width / 2) / gridSize + nX,
			displacement,
			(y - grassMap.height / 2) / gridSize + nY,
		).multiplyScalar(gridSize)
		if (n * n2 < 0.2) return
		const isFlower = nF > 0.9
		const grassGenerator = isFlower
			? flowers[Math.floor(flowers.length * Math.abs(nF2))]
			: grass[Math.floor(grass.length * Math.abs(nF2))]
		const instanceHandle = grassGenerator.addAt(position, 1, new Euler(0, nF2, 0))
		instances.set(instanceHandle, position)
		return { position, instanceHandle }
	})
	return { instanceHandles, process }
}