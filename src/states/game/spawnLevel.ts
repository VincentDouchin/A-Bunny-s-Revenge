import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { createNoise2D, createNoise3D } from 'simplex-noise'
import type { Vector4Like } from 'three'
import { CanvasTexture, Euler, Group, Mesh, PlaneGeometry, Quaternion, Vector3 } from 'three'
import { enemyBundle } from '../dungeon/enemies'
import { spawnLight } from './spawnLights'
import type { Level } from '@/debug/LevelEditor'
import { getModel, props } from '@/debug/props'
import type { InstanceHandle } from '@/global/assetLoaders'
import { canvasToArray, canvasToGrid, instanceMesh } from '@/global/assetLoaders'
import type { Entity } from '@/global/entity'
import { assets, ecs, levelsData, time } from '@/global/init'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { getBoundingBox, getSize } from '@/lib/models'
import type { System } from '@/lib/state'
import { GroundMaterial, WaterMaterial } from '@/shaders/GroundShader'
import { getScreenBuffer } from '@/utils/buffer'

const SCALE = 10
const HEIGHT = 60

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
	const trees = Object.values(assets.trees).map(instanceMesh)
	const treesInstances: InstanceHandle[] = []
	const noise = createNoise3D(() => 0)
	spawnFromCanvas(level, level.trees, SCALE, (val, x, y, displacement) => {
		if (val.x === 255 || val.y === 255) {
			const position = new Vector3(
				(x - level.trees.width / 2) / SCALE + noise(x, y, y),
				displacement,
				(level.trees.height / 2 - y) / SCALE + noise(y, x, x),
			).multiplyScalar(SCALE)
			const size = 3 + (1 * Math.abs(noise(x, y, x)))
			const treeGenerator = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const instanceHandle = treeGenerator.addAt(position, size, new Euler(0, noise(x, y, x), 0))
			if (val.x === 255) treesInstances.push(instanceHandle)
			const treeSize = getSize(treeGenerator.glb.scene).multiplyScalar(size)
			ecs.add({
				inMap: true,
				position,
				instanceHandle,
				group: new Group(),
				size: treeSize,
				bodyDesc: RigidBodyDesc.fixed().lockRotations(),
				colliderDesc: ColliderDesc.cylinder(treeSize.y / 2, treeSize.x / 2),
				tree: true,
				parent,
			})
		}
	})
	for (const tree of trees) {
		const group = tree.process()
		ecs.add({ group, inMap: true, tree: true, parent })
	}
	for (const treesInstance of treesInstances) {
		treesInstance.setUniform('playerZ', 1)
	}
}

export const spawnGrass = (level: Level, parent: Entity) => {
	const grass = Object.entries(assets.models).filter(([name]) => name.includes('Grass')).map(x => instanceMesh(x[1]))
	const flowers = Object.entries(assets.models).filter(([name]) => name.includes('Flower')).map(x => instanceMesh(x[1]))
	const noise = createNoise2D(() => 0)
	const noise2 = createNoise2D(() => 100)
	const noiseX = createNoise2D(() => 200)
	const noiseY = createNoise2D(() => 300)
	const noiseFlower = createNoise2D(() => 400)
	const noiseFlower2 = createNoise2D(() => 500)
	spawnFromCanvas(level, level.grass, 5, (val, x, y, displacement) => {
		if (val.x !== 255) return
		const n = noise(x / level.size.x * 10, y / level.size.y * 10)
		const n2 = noise2(x / level.size.x * 10, y / level.size.y * 10)
		const nX = noiseX(x / level.size.x * 10, y / level.size.y * 10)
		const nY = noiseY(x / level.size.x * 10, y / level.size.y * 10)
		const nF = noiseFlower(x / level.size.x * 100, y / level.size.y * 100)
		const nF2 = noiseFlower2(x / level.size.x * 10, y / level.size.y * 10)
		if (n2 < 0.7 && (n < 0 || n2 < 0)) return
		const position = new Vector3(
			(x - level.grass.width / 2) / SCALE + nX,
			0.1 + displacement,
			(level.grass.height / 2 - y) / SCALE + nY,
		).multiplyScalar(SCALE)
		const isFlower = nF > 0.8
		const size = 1
		const grassGenerator = isFlower
			? flowers[Math.floor(flowers.length * Math.abs(nF2))]
			: grass[Math.floor(grass.length * Math.abs(nF2))]
		const instanceHandle = grassGenerator.addAt(position, size, new Euler(0, noise(x, y), 0))
		ecs.add({
			inMap: true,
			position,
			instanceHandle,
			grass: true,
			parent,
		})
	})
	grass.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true, grass: true, parent })
	})
	flowers.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true, grass: true, parent })
	})
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
	const waterMesh = new Mesh(new PlaneGeometry(level.size.x, level.size.y), new (WaterMaterial(level.size))({ map: waterMap, transparent: true }))
	waterMesh.receiveShadow = true
	return {
		model: waterMesh,
		position: new Vector3(0, -3, 0),
		withTimeUniform: true,
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
	} as const satisfies Entity
}

export const spawnGroundAndTrees = (level: Level) => {
	const displacementMap = getdisplacementMap(level)

	// ! Ground
	const groundMesh = new Mesh(
		new PlaneGeometry(level.size.x, level.size.y, level.size.x, level.size.y),
		new (GroundMaterial(level.path, level.size.x, level.size.y))({ displacementMap: new CanvasTexture(displacementMap), displacementScale: HEIGHT, displacementBias: 0 }),
	)
	groundMesh.material.displacementMap!.flipY = false
	groundMesh.rotation.x = -Math.PI / 2
	groundMesh.position.y = -HEIGHT / 4
	groundMesh.receiveShadow = true
	const heightfieldMap = getdisplacementMap(level, false)
	const heights = canvasToArray(heightfieldMap).map(pixel => pixel.x / 255)
	const heightfield = new Float32Array(heights.length)
	heightfield.set(heights)

	const ground = ecs.add({
		model: groundMesh,
		inMap: true,
		position: new Vector3(0, 0, 0),
		bodyDesc: new RigidBodyDesc(RigidBodyType.Fixed),
		colliderDesc: ColliderDesc
			.heightfield(
				level.size.x - 1,
				level.size.y - 1,
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
	const level = levelsData.levels.find(level => level.farm)!
	ecs.add({ map: level.id })
	spawnGroundAndTrees(level)
}
export const spawnDungeon: System<DungeonRessources> = ({ dungeon }) => {
	ecs.add({ map: dungeon.plan.id })
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemyBundle(enemy),
			position: new Vector3(between(-10, 10), 0, between(-10, 10)),
		})
	}
	spawnGroundAndTrees(dungeon.plan)
}

const mapQuery = ecs.with('map')
export const spawnLevelData: System<FarmRessources | DungeonRessources> = (ressources) => {
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
					inMap: true,

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
const withTimeUniformQuery = ecs.with('withTimeUniform', 'model')
export const updateTimeUniforms = () => {
	for (const entity of withTimeUniformQuery) {
		if (entity.model instanceof Mesh)
			entity.model.material.uniforms.time.value = time.elapsed / 1000
	}
}