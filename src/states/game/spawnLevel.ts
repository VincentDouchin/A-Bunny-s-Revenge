import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import FastNoiseLite from 'fastnoise-lite'
import { between } from 'randomish'
import type { Vec2, Vector4Like } from 'three'
import { CanvasTexture, Euler, Group, Mesh, PlaneGeometry, Quaternion, Vector2, Vector3 } from 'three'
import { encounters } from '../dungeon/encounters'
import { enemyBundle } from '../dungeon/enemies'
import { RoomType } from '../dungeon/generateDungeon'
import { spawnLight } from './spawnLights'
import type { Level } from '@/debug/LevelEditor'
import { getModel, props } from '@/debug/props'
import type { InstanceHandle } from '@/global/assetLoaders'
import { canvasToArray, canvasToGrid, instanceMesh } from '@/global/assetLoaders'
import type { Entity } from '@/global/entity'
import { assets, ecs, levelsData, time } from '@/global/init'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import { getBoundingBox, getSize } from '@/lib/models'
import type { System } from '@/lib/state'
import { GroundMaterial, WaterMaterial } from '@/shaders/materials'
import { getScreenBuffer, scaleCanvas } from '@/utils/buffer'

const SCALE = 10
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

export const spawnTrees = (level: Level, parent: Entity) => {
	const trees = Object.values(assets.trees).map(x => instanceMesh(x.scene, true))
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
				bodyDesc: RigidBodyDesc.fixed().lockRotations().setSleeping(true),
				colliderDesc: ColliderDesc.cylinder(treeSize.y / 2, treeSize.x / 2),
				tree: true,
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
	}
}
export const spawnGrass = (level: Level, parent: Entity) => {
	const grass = Object.entries(assets.vegetation).filter(([name]) => name.includes('Grass')).map(x => instanceMesh(x[1].scene, true))
	const flowers = Object.entries(assets.vegetation).filter(([name]) => name.includes('Flower')).map(x => instanceMesh(x[1].scene, true))
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
		const isFlower = nF > 0.9
		const size = 1
		const grassGenerator = isFlower
			? flowers[Math.floor(flowers.length * Math.abs(nF2))]
			: grass[Math.floor(grass.length * Math.abs(nF2))]
		const instanceHandle = grassGenerator.addAt(position, size, new Euler(0, noise(x, y), 0))
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
	}
}

export const getdisplacementMap = (level: Level, invert = true) => {
	const ctx = getScreenBuffer(level.heightMap.width, level.heightMap.height)
	// ! heightmap
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
		ctx.filter = 'invert(1)'
	}
	ctx.drawImage(level.water, 0, 0)
	ctx.restore()
	return ctx.canvas
}

const waterBundle = (level: Level) => {
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
		withTimeUniform: true,
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
	} as const satisfies Entity
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
		const y = Math.ceil(index / width) + 1

		positionAttribute.setZ(width * (height - y) + x, displacementVal)
	}
	positionAttribute.needsUpdate = true
}

export const spawnGroundAndTrees = (level: Level) => {
	const canvasScale = 0.5
	const displacementMap = scaleCanvas(getdisplacementMap(level), canvasScale)
	const displacementTexture = new CanvasTexture(displacementMap)
	displacementTexture.flipY = false
	// ! Ground
	const levelTexture = new CanvasTexture(level.path)
	levelTexture.flipY = false
	const groundMesh = new Mesh(
		new PlaneGeometry(level.size.x, level.size.y, Math.floor(level.size.x * canvasScale), Math.floor(level.size.y * canvasScale)),
		new GroundMaterial({}).setUniforms({
			level: levelTexture,
			size: new Vector2(level.size.x, level.size.y),
			ground: assets.textures.Dirt4_Dark,
		}),
	)
	setDisplacement(groundMesh.geometry, displacementMap)
	groundMesh.geometry.computeVertexNormals()
	groundMesh.geometry.computeTangents()
	groundMesh.rotation.x = -Math.PI / 2
	groundMesh.position.y = -HEIGHT / 4
	groundMesh.receiveShadow = true
	const heightfieldMap = scaleCanvas(getdisplacementMap(level, false), 0.2)
	const heights = canvasToArray(heightfieldMap).map(pixel => pixel.x / 255)
	const heightfield = new Float32Array(heights.length)
	heightfield.set(heights)

	const ground = ecs.add({
		model: groundMesh,
		...inMap(),
		position: new Vector3(0, 0, 0),
		bodyDesc: new RigidBodyDesc(RigidBodyType.Fixed),
		colliderDesc: ColliderDesc
			.heightfield(
				level.size.x / 5 - 1,
				level.size.y / 5 - 1,
				heightfield,
				{ x: level.size.y, y: HEIGHT, z: level.size.x },
			)
			.setTranslation(0, -HEIGHT / 4, 0)
			.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)),
		ground: true,
	})
	ecs.add({
		parent: ground,
		...waterBundle(level),
	})
	spawnLight(level.size, ground)
	spawnTrees(level, ground)
	spawnGrass(level, ground)
}

export const spawnFarm: System<FarmRessources> = () => {
	const level = levelsData.levels.find(level => level.farm)
	if (!level) throw new Error('can\'t find farm')
	ecs.add({ map: level.id })
	spawnGroundAndTrees(level)
}
export const spawnCrossRoad = () => {
	const level = levelsData.levels.find(level => level.crossRoad)
	if (!level) throw new Error('can\'t find crossroad')
	ecs.add({ map: level.id })
	spawnGroundAndTrees(level)
}
export const spawnDungeon: System<DungeonRessources> = ({ dungeon, dungeonLevel }) => {
	ecs.add({ map: dungeon.plan.id, dungeon })
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemyBundle(enemy, dungeonLevel),
			position: new Vector3(between(-20, 20), 0, between(-20, 20)),
		})
	}
	if (dungeon.type === RoomType.NPC && dungeon.encounter) {
		encounters[dungeon.encounter]()
	}
	spawnGroundAndTrees(dungeon.plan)
}

const mapQuery = ecs.with('map')
export const spawnLevelData: System<FarmRessources | DungeonRessources | void> = (ressources) => {
	for (const { map } of mapQuery) {
		const { levelData, colliderData } = levelsData
		for (const [entityId, entityData] of Object.entries(levelData ?? {})) {
			if (entityData?.map === map) {
				const model = getModel(entityData.model)
				model.scale.setScalar(entityData.scale)
				const position = new Vector3().fromArray(entityData.position)
				const rotation = new Quaternion().set(...entityData.rotation)
				const bundleFn = props.find(p => p.models.includes(entityData.model))?.bundle
				const entity = {
					rotation,
					position,
					...getBoundingBox(entityData.model, model, colliderData),
					entityId,
					model,
					...inMap(),
				} as const satisfies Entity

				if (bundleFn) {
					ecs.add(bundleFn(entity, entityData, ressources))
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
		if (entity.model instanceof Mesh)
			entity.model.material.uniforms.time.value = time.elapsed / 1000
		if (entity.instanceHandle) {
			entity.instanceHandle.setUniform('time', time.elapsed / 1000)
		}
	}
}