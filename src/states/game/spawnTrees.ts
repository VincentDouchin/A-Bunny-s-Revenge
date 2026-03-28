import type { QuaternionLike, Texture, Vector2Like, Vector3Like, Vector4Like } from 'three/webgpu'
import FastNoiseLite from 'fastnoise-lite'
import { instancedBufferAttribute } from 'three/tsl'
import { Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Vector3 } from 'three/webgpu'
import { canvasToBuffer } from '@/global/assetLoaders'
import { GrassMaterial } from '@/shaders/grassMaterial'
import { round } from '@/utils/mapFunctions'

export const setDisplacement = (size: Vector2Like, heightCanvas: HTMLCanvasElement | null, waterCanvas: HTMLCanvasElement | null, heightOffset: number) => {
	const canvasScale = 1
	const geo = new PlaneGeometry(size.x, size.y, Math.floor(size.x * canvasScale) - 1, Math.floor(size.y * canvasScale) - 1)
	const width = geo.parameters.widthSegments + 1
	const height = geo.parameters.heightSegments + 1
	const positionAttribute = geo.getAttribute('position')
	const ctx = heightCanvas?.getContext('2d', { willReadFrequently: true })

	const imageData = ctx?.getImageData(0, 0, width, height).data
	const waterCtx = waterCanvas?.getContext('2d', { willReadFrequently: true })
	const waterData = waterCtx?.getImageData(0, 0, width, height).data
	for (let i = 0; i < (width * height * 4); i += 4) {
		const index = i / 4
		const x = index % width
		const y = Math.floor(index / width) + 1
		if (waterData && waterData[i - 1]) {
			positionAttribute.setZ(width * y + x, 0)
		} else {
			let displacementVal = 0.5 + (imageData?.[i] ?? 0) / 255 / 2
			displacementVal *= heightOffset
			positionAttribute.setZ(width * y + x, displacementVal)
		}
	}
	positionAttribute.needsUpdate = true
	geo.computeVertexNormals()
	geo.computeTangents()
	return geo
}
const spawnFromCanvas = <C extends (HTMLCanvasElement | null)[], T>(
	displacementMap: HTMLCanvasElement | null,
	images: C,
	scale: number,
	heightDelta: number,
	fn: (values: { [K in keyof C]: Vector4Like | null }, x: number, y: number, z: number) => T | undefined,
) => {
	const dispData = displacementMap ? canvasToBuffer(displacementMap) : null
	const imgDatas = images.map(image => image ? canvasToBuffer(image) : null)
	const image = images[0]!
	const width = image.width
	const height = image.height
	const result: T[] = []

	const displacementFactor = heightDelta / 2 / scale / 255

	for (let y = 0; y < height; y += scale) {
		for (let x = 0; x < width; x += scale) {
			const idx = (y * width + x) * 4

			const displacement = (dispData?.[idx] ?? 0) * displacementFactor // red channel
			const values = imgDatas.map((imgData) => {
				if (imgData) {
					return { x: imgData[idx], y: imgData[idx + 1], z: imgData[idx + 2], w: imgData[idx + 3] }
				}
				return null
			}) as { [K in keyof C]: Vector4Like | null }
			const res = fn(
				values,
				x,
				y,
				displacement,
			)

			if (res !== undefined) {
				result.push(res)
			}
		}
	}

	return result
}

const vec3toRaw = ({ x, y, z }: Vector3Like) => ({ x: round(x), y: round(y), z: round(z) })
const quattoRaw = ({ x, y, z, w }: QuaternionLike) => ({ x: round(x), y: round(y), z: round(z), w: round(w) })
export const composeMatrix = (args: { position: Vector3Like, scale: Vector3Like, rotation: QuaternionLike }) => {
	return new Matrix4().compose(
		new Vector3().copy(args.position),
		new Quaternion().copy(args.rotation),
		new Vector3().copy(args.scale),
	)
}

export const getTrees = (possibleModels: number, displacement: HTMLCanvasElement | null, treeMap: HTMLCanvasElement, gridSize: number, HEIGHT: number) => {
	const trees: {
		position: Vector3Like
		rotation: QuaternionLike
		scale: Vector3Like
		matrix: Matrix4
		transparent: boolean
	}[][] = []
	const noise = new FastNoiseLite(0)
	noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
	spawnFromCanvas(displacement, [treeMap], gridSize, HEIGHT, ([val], x, y, displacement) => {
		if (val?.x === 255 || val?.y === 255) {
			const position = new Vector3(
				(x - treeMap.width / 2) / gridSize + noise.GetNoise(x, y, y),
				displacement,
				(y - treeMap.height / 2) / gridSize + noise.GetNoise(y, x, x),
			).multiplyScalar(gridSize)
			const rotation = new Quaternion().setFromEuler(new Euler(0, noise.GetNoise(x, y, x), 0))
			const scale = new Vector3().setScalar(3 + (1 * Math.abs(noise.GetNoise(x, y, x))))
			const treeIndex = Math.floor(possibleModels * Math.abs(Math.sin((x + y) * 50 * (x - y))))
			trees[treeIndex] ??= []
			const treeGroup = trees[treeIndex]
			const transparent = val?.x === 255
			const matrix = new Matrix4().compose(position, rotation, scale)

			treeGroup.push({
				position: vec3toRaw(position),
				rotation: quattoRaw(rotation),
				scale: vec3toRaw(scale),
				matrix,
				transparent,
			})
		}
	})
	return trees
}

export const getGrass = (
	displacement: HTMLCanvasElement | null,
	grassMap: HTMLCanvasElement,
	waterMap: HTMLCanvasElement | null,
	pathMap: HTMLCanvasElement | null,
	gridSize: number,
	HEIGHT: number,
) => {
	const grass: {
		position: Vector3Like
		scale: number
	}[] = []
	const noise = new FastNoiseLite(0)
	noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
	spawnFromCanvas(displacement, [grassMap, waterMap, pathMap], gridSize, HEIGHT, ([grassVal, waterVal, pathVal], x, y, displacement) => {
		if (grassVal?.y === 255 && waterVal?.z !== 255 && (!pathVal || pathVal.w < 140)) {
			const position = new Vector3(
				(x - grassMap.width / 2) / gridSize + noise.GetNoise(x, y, y) * gridSize,
				displacement,
				(y - grassMap.height / 2) / gridSize + noise.GetNoise(y, x, x) * gridSize,
			).multiplyScalar(gridSize)
			const scale = 0.5 + (1 * Math.abs(noise.GetNoise(x, y, x)))
			grass.push({
				position: vec3toRaw(position),
				scale: round(scale),
			})
		}
	})
	return grass
}

export const getGrassModel = (
	grassTexture: Texture,
	grassNoiseTexture: Texture,
	maps: { heightMap?: HTMLCanvasElement, grassMap: HTMLCanvasElement, waterMap?: HTMLCanvasElement, pathMap?: HTMLCanvasElement },
	displacementScale: number,
	size: { x: number, y: number },
) => {
	const grass = getGrass(
		maps?.heightMap ?? null,
		maps.grassMap,
		maps?.waterMap ?? null,
		maps?.pathMap ?? null,
		1,
		displacementScale,
	)
	if (grass.length === 0) return null
	const bladeWidth = 4
	const bladeHeight = 4
	const geo = new PlaneGeometry(bladeWidth, bladeHeight)
	geo.translate(0, bladeHeight / 2, 0)

	const mat = new GrassMaterial(grassTexture, grassNoiseTexture, size)
	const positionData = new Float32Array(grass.flatMap(({ position }) => [position.x, position.y, position.z]))
	const positionAttribute = new InstancedBufferAttribute(positionData, 3)
	const instancePos = instancedBufferAttribute(positionAttribute)
	mat.positionNode = instancePos

	const mesh = new InstancedMesh(geo, mat, grass.length)
	mesh.frustumCulled = false
	mesh.instanceMatrix.needsUpdate = true
	mesh.renderOrder = -1
	mesh.receiveShadow = true
	return mesh
}
