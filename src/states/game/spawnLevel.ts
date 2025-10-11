import type { Vec2, Vector4Like } from 'three'
import type { EntityData, Level, LevelType } from '@/debug/LevelEditor'
import type { InstanceHandle } from '@/global/assetLoaders'
import type { Entity } from '@/global/entity'
import type { app } from '@/global/states'
import type { AppStates, UpdateSystem } from '@/lib/app'
import { ActiveEvents, ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import FastNoiseLite from 'fastnoise-lite'
import { CanvasTexture, Euler, Group, Mesh, MeshToonMaterial, PlaneGeometry, Quaternion, Vector2, Vector3 } from 'three'
import { getModel, props } from '@/debug/props'
import { canvasToArray, canvasToGrid, instanceMesh } from '@/global/assetLoaders'
import { assets, ecs, levelsData, time } from '@/global/init'
import { getBoundingBox, getSecondaryColliders } from '@/lib/colliders'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { getSize } from '@/lib/models'
import { GroundMaterial, WaterMaterial } from '@/shaders/materials'
import { getScreenBuffer, scaleCanvas } from '@/utils/buffer'
import { encounters } from '../dungeon/encounters'
import { RoomType } from '../dungeon/generateDungeon'
import { spawnLight } from './spawnLights'

export const SCALE = 10
export const HEIGHT = 240

const spawnFromCanvas = (level: Level, image: HTMLCanvasElement, scale: number, fn: (val: Vector4Like, x: number, y: number, z: number) => void) => {
	const heightGrid = canvasToGrid(level.heightMap)
	const grid = canvasToGrid(image)
	for (let y = 0; y < grid.length; y += scale) {
		const treeRow = grid[y]
		for (let x = 0; x < treeRow.length; x += scale) {
			const height = heightGrid[y][x]
			const displacement = height.x / 255 * HEIGHT / 2 / SCALE
			const val = treeRow[x]
			fn(val, x, y, displacement)
		}
	}
}
const getTrees = (_level?: number) => {
	// if (level === 1) {
	// 	return [
	// 		assets.trees.CommonTree_Dead_1,
	// 		assets.trees.CommonTree_Dead_2,
	// 		assets.trees.CommonTree_Dead_3,
	// 		assets.trees.CommonTree_Dead_4,
	// 		assets.trees.CommonTree_Dead_5,
	// 		assets.trees.Willow_1,
	// 		assets.trees.Willow_2,
	// 	]
	// }
	return [
		assets.trees.Low_Poly_Forest_treeTall01,
		assets.trees.Low_Poly_Forest_treeTall02,
		assets.trees.Low_Poly_Forest_treeTall03,
		assets.trees.Low_Poly_Forest_treeTall04,
	]
}
export const spawnTrees = (level: Level, parent: Entity, dungeonLevel?: number, withCollider = true) => {
	const trees = getTrees(dungeonLevel).map(x => instanceMesh(x.scene, true))
	const treesInstances: InstanceHandle[] = []
	const noise = new FastNoiseLite(0)
	noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
	const treeMap = new Map<Vec2, InstanceHandle>()
	spawnFromCanvas(level, level.trees, SCALE, (val, x, y, displacement) => {
		if (val.x === 255 || val.y === 255) {
			const position = new Vector3(
				(x - level.trees.width / 2) / SCALE + noise.GetNoise(x, y, y),
				displacement,
				(level.trees.height / 2 - y) / SCALE + noise.GetNoise(y, x, x),
			).multiplyScalar(SCALE)
			const size = 3 + (1 * Math.abs(noise.GetNoise(x, y, x)))
			const treeGenerator = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const instanceHandle = treeGenerator.addAt(position, size, new Euler(0, noise.GetNoise(x, y, x), 0))
			if (val.x === 255) treesInstances.push(instanceHandle)
			treeMap.set(position, instanceHandle)
			const treeSize = getSize(treeGenerator.obj).multiplyScalar(size)
			ecs.add({
				...inMap(),
				position,
				instanceHandle,
				group: new Group(),
				size: treeSize,
				...(withCollider
					? { bodyDesc: RigidBodyDesc.fixed().lockRotations().setSleeping(true), colliderDesc: ColliderDesc.cylinder(treeSize.y / 2, treeSize.x / 2).setTranslation(0, treeSize.y / 2, 0).setCollisionGroups(collisionGroups('obstacle', ['obstacle', 'enemy', 'player'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS) }
					: {}),
				tree: true,
				obstacle: true,
				withTimeUniform: true,
				parent,
			})
		}
	})
	for (const tree of trees) {
		const group = tree.process()
		ecs.add({ group, ...inMap(), tree: true, parent })
	}
	for (const treesInstance of treesInstances) {
		treesInstance.setUniform('playerZ', 1)
	}
	for (const [pos, tree] of treeMap.entries()) {
		tree.setUniform('pos', pos)
		tree.setUniform('height', 15)
	}
}
export const spawnGrass = (level: Level, parent: Entity, dungeonLevel?: number) => {
	const grass = Object.entries(assets.vegetation).filter(([name]) => name.includes('Grass')).map(x => instanceMesh(x[1].scene, true))

	const flowers = Object.entries(assets.vegetation).filter(([name]) => name.includes('Flower_')).map(x => instanceMesh(x[1].scene, true))
	const createNoise = (seed: number) => {
		const noise = new FastNoiseLite(seed)
		noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
		return (x: number, y: number) => {
			return noise.GetNoise(x, y)
		}
	}

	const instances = new Map<InstanceHandle, Vec2>()
	spawnFromCanvas(level, level.grass, 5, (val, x, y, displacement) => {
		if (val.x !== 255) return
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
			(x - level.grass.width / 2) / SCALE + nX,
			0 + displacement,
			(level.grass.height / 2 - y) / SCALE + nY,
		).multiplyScalar(SCALE)
		if (n * n2 < 0.2) return
		const isFlower = nF > 0.9 && dungeonLevel !== 1
		const grassGenerator = isFlower
			? flowers[Math.floor(flowers.length * Math.abs(nF2))]
			: grass[Math.floor(grass.length * Math.abs(nF2))]
		const instanceHandle = grassGenerator.addAt(position, 1, new Euler(0, nF2, 0))
		instances.set(instanceHandle, position)
		ecs.add({
			...inMap(),
			position,
			instanceHandle,
			grass: true,
			parent,
			withTimeUniform: true,
		})
	})
	grass.forEach((t) => {
		const group = t.process()
		ecs.add({ group, ...inMap(), grass: true, parent })
	})
	flowers.forEach((t) => {
		const group = t.process()
		ecs.add({ group, ...inMap(), grass: true, parent })
	})
	for (const [handle, pos] of instances.entries()) {
		handle.setUniform('pos', pos)
		handle.setUniform('height', 3)
	}
}

export const getDisplacementMap = (level: Level, invert = true) => {
	const ctx = getScreenBuffer(level.heightMap.width, level.heightMap.height)
	// ! heightMap
	const filledHeightMap = getScreenBuffer(level.heightMap.width, level.heightMap.height)
	filledHeightMap.fillStyle = 'black'
	filledHeightMap.fillRect(0, 0, level.heightMap.width, level.heightMap.height)
	filledHeightMap.drawImage(level.heightMap, 0, 0)
	// ! combine
	ctx.fillStyle = 'rgb(128,128,128)'
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	ctx.save()
	ctx.globalAlpha = 0.5
	ctx.drawImage(filledHeightMap.canvas, 0, 0)
	ctx.restore()
	// ! water
	ctx.save()
	if (invert) {
		ctx.filter = `invert(1)`
	}
	ctx.drawImage(level.water, 0, 0)

	ctx.restore()
	return ctx.canvas
}

const waterBundle = (level: Level): Entity => {
	const waterMap = new CanvasTexture(level.water)
	waterMap.flipY = false
	const waterMesh = new Mesh(
		new PlaneGeometry(level.size.x, level.size.y),
		new WaterMaterial({ map: waterMap, transparent: true }).setUniforms({ size: new Vector2(level.size.x, level.size.y) }),
	)
	waterMesh.receiveShadow = true
	return {
		model: waterMesh,
		position: new Vector3(0, -3, 0),
		withTimeUniform: [waterMesh.material],
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
	}
}
export const setDisplacement = (geo: PlaneGeometry, canvas: HTMLCanvasElement) => {
	const width = geo.parameters.widthSegments + 1
	const height = geo.parameters.heightSegments + 1
	const positionAttribute = geo.getAttribute('position')
	const ctx = canvas.getContext('2d')!
	const imageData = ctx.getImageData(0, 0, width, height).data
	for (let i = 0; i < (width * height * 4); i += 4) {
		let displacementVal = imageData[i] / 255.0
		displacementVal *= HEIGHT
		const index = i / 4
		const x = index % width
		const y = Math.floor(index / width) + 1
		positionAttribute.setZ(width * (height - y) + x, displacementVal)
	}
	positionAttribute.needsUpdate = true
}

const getWoodFlooring = ({ x, y }: { x: number, y: number }) => {
	const map = assets.textures.planks
	map.repeat.set(x / 32, y / 32)
	const mat = new MeshToonMaterial({ map })
	return mat
}

export const spawnGroundAndTrees = (level: Level, dungeonLevel?: number) => {
	const canvasScale = 0.5
	const displacementMap = scaleCanvas(getDisplacementMap(level), canvasScale)
	const displacementTexture = new CanvasTexture(displacementMap)
	displacementTexture.flipY = false
	// ! Ground
	const levelTexture = new CanvasTexture(level.path)
	levelTexture.flipY = false
	const rockTexture = new CanvasTexture(level.rock)
	rockTexture.flipY = false
	const cellar = level.type === 'cellar'
	const mat = cellar
		? getWoodFlooring(level.size)
		: new GroundMaterial({}).setUniforms({
				level: levelTexture,
				rock: rockTexture,
				size: new Vector2(level.size.x, level.size.y),
				ground: assets.textures.Dirt4_Dark,
				rock_texture: assets.textures.Rocks1_Light,
			})
	const groundMesh = new Mesh(
		new PlaneGeometry(level.size.x, level.size.y, Math.floor(level.size.x * canvasScale) - 1, Math.floor(level.size.y * canvasScale) - 1),
		mat,
	)
	setDisplacement(groundMesh.geometry, displacementMap)
	groundMesh.geometry.computeVertexNormals()
	groundMesh.geometry.computeTangents()
	groundMesh.rotation.x = -Math.PI / 2
	groundMesh.position.y = -HEIGHT / 4
	groundMesh.receiveShadow = true
	const heightfieldMap = scaleCanvas(getDisplacementMap(level, false), 0.2)
	const heights = canvasToArray(heightfieldMap).map(pixel => pixel.y / 255)
	const heightfield = new Float32Array(heights.length)
	heightfield.set(heights)
	const colliderNorth = ColliderDesc.cuboid(level.size.x / 2, 50, 1).setTranslation(0, 0, level.size.y + 0.5 / 2)
	const colliderSouth = ColliderDesc.cuboid(level.size.x / 2, 50, 1).setTranslation(0, 0, -(level.size.y + 0.5) / 2)
	const colliderEast = ColliderDesc.cuboid(1, 50, level.size.y / 2).setTranslation(level.size.x / 2 + 0.5, 0, 0)
	const colliderWest = ColliderDesc.cuboid(1, 50, level.size.y / 2).setTranslation(-(level.size.x / 2 + 0.5), 0, 0)
	const secondaryCollidersDesc = [colliderNorth, colliderSouth, colliderEast, colliderWest]
	const ground = ecs.add({
		model: groundMesh,

		...inMap(),
		position: new Vector3(0, 0, 0),
		bodyDesc: new RigidBodyDesc(RigidBodyType.Fixed)
			.setCcdEnabled(true),
		colliderDesc: ColliderDesc
			.heightfield(
				level.size.x / 5 - 1,
				level.size.y / 5 - 1,
				heightfield,
				{ x: level.size.y, y: HEIGHT, z: level.size.x },
			)
			.setTranslation(0, -HEIGHT / 4, 0)
			.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2))
			.setCollisionGroups(collisionGroups('floor', ['enemy', 'player']))
			.setActiveEvents(ActiveEvents.COLLISION_EVENTS),
		ground: true,
		secondaryCollidersDesc,
	})
	ecs.add({
		parent: ground,
		...waterBundle(level),
	})
	spawnLight(level.size, ground)
	spawnTrees(level, ground, dungeonLevel)
	spawnGrass(level, ground, dungeonLevel)
}

export const spawnLevel = (type: LevelType, stateEntity: AppStates<typeof app>) => () => {
	const level = levelsData.levels.find(level => level.type === type)
	if (!level) throw new Error(`can\'t find level of type ${type}`)
	ecs.add({ map: level.id, stateEntity })
	spawnGroundAndTrees(level)
}

export const spawnDungeon: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon, dungeonLevel }) => {
	ecs.add({ map: dungeon.plan.id, dungeon, stateEntity: 'dungeon' })
	spawnGroundAndTrees(dungeon.plan, dungeonLevel)

	if (dungeon.type === RoomType.NPC && dungeon.encounter) {
		encounters[dungeon.encounter]()
	}
}

const mapQuery = ecs.with('map')
export const spawnLevelData: UpdateSystem<typeof app, 'dungeon' | 'farm' | void> = (resources) => {
	for (const { map } of mapQuery) {
		const { levelData, colliderData } = levelsData
		for (const [entityId, entityData] of Object.entries(levelData ?? {})) {
			if (entityData?.map === map) {
				const model = getModel(entityData.model)
				model.scale.setScalar(entityData.scale)
				const position = new Vector3().fromArray(entityData.position)
				const rotation = new Quaternion().fromArray(entityData.rotation)
				const bundleFn = props.find(p => p.models.includes(entityData.model))?.bundle

				const entity = {
					rotation,
					position,
					...getBoundingBox(entityData.model, model, colliderData, entityData.scale ?? 1),
					...getSecondaryColliders(model),
					entityId,
					model,
					...inMap(),
				} as const satisfies Entity

				if (bundleFn) {
					ecs.add(bundleFn(entity, entityData as EntityData<never>, resources))
				} else {
					ecs.add(entity)
				}
			}
		}
	}
}

const withTimeUniformQuery = ecs.with('withTimeUniform')
export const updateTimeUniforms = () => {
	for (const entity of withTimeUniformQuery) {
		if (Array.isArray(entity.withTimeUniform)) {
			for (const mat of entity.withTimeUniform) {
				(mat as any).uniforms.time.value = time.elapsed / 1000
				if (entity.shake) {
					(mat as any).uniforms.shake.value = entity.shake
				}
			}
		}
		if (entity.instanceHandle) {
			entity.instanceHandle.setUniform('time', time.elapsed / 1000)
		}
	}
}
