import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { createNoise2D, createNoise3D } from 'simplex-noise'
import type { Vector4Like } from 'three'
import { CanvasTexture, Euler, Group, Mesh, PlaneGeometry, Quaternion, RepeatWrapping, Vector3 } from 'three'
import { enemyBundle } from '../dungeon/enemies'
import { spawnLight } from './spawnLights'
import type { Level } from '@/debug/LevelEditor'
import { getModel, props } from '@/debug/props'
import type { InstanceHandle } from '@/global/assetLoaders'
import { canvasToArray, instanceMesh } from '@/global/assetLoaders'
import type { Entity } from '@/global/entity'
import { assets, ecs, levelsData } from '@/global/init'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { getBoundingBox, getSize } from '@/lib/models'
import type { System } from '@/lib/state'
import { GroundMaterial } from '@/shaders/GroundShader'

const SCALE = 10

const spawnFromCanvas = (image: HTMLCanvasElement, scale: number, fn: (val: Vector4Like, x: number, y: number) => void) => {
	const grid = canvasToArray(image)
	for (let i = 0; i < grid.length; i += scale) {
		const treeRow = grid[i]
		for (let j = 0; j < treeRow.length; j += scale) {
			const val = treeRow[j]
			fn(val, j, i)
		}
	}
}

export const spawnTrees = (level: Level) => {
	const trees = Object.values(assets.trees).map(instanceMesh)
	const treesInstances: InstanceHandle[] = []
	const noise = createNoise3D(() => 0)
	spawnFromCanvas(level.trees, SCALE, (val, x, y) => {
		if (val.x === 255 || val.y === 255) {
			const position = new Vector3(
				(level.trees.width / 2 - x) / SCALE + noise(x, y, y),
				0,
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
			})
		}
	})
	trees.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true, tree: true })
	})
	for (const treesInstance of treesInstances) {
		treesInstance.setUniform('playerZ', 1)
	}
}
export const spawnGrass = (level: Level) => {
	const grass = Object.entries(assets.models).filter(([name]) => name.includes('Grass')).map(x => instanceMesh(x[1]))
	const flowers = Object.entries(assets.models).filter(([name]) => name.includes('Flower')).map(x => instanceMesh(x[1]))
	const noise = createNoise2D(() => 0)
	const noise2 = createNoise2D(() => 100)
	const noiseX = createNoise2D(() => 200)
	const noiseY = createNoise2D(() => 300)
	const noiseFlower = createNoise2D(() => 400)
	const noiseFlower2 = createNoise2D(() => 500)
	spawnFromCanvas(level.grass, 5, (val, x, y) => {
		if (val.x !== 255) return
		const n = noise(x / level.size.x * 10, y / level.size.y * 10)
		const n2 = noise2(x / level.size.x * 10, y / level.size.y * 10)
		const nX = noiseX(x / level.size.x * 10, y / level.size.y * 10)
		const nY = noiseY(x / level.size.x * 10, y / level.size.y * 10)
		const nF = noiseFlower(x / level.size.x * 100, y / level.size.y * 100)
		const nF2 = noiseFlower2(x / level.size.x * 10, y / level.size.y * 10)
		if (n2 < 0.7 && (n < 0 || n2 < 0)) return
		const position = new Vector3(
			(level.grass.width / 2 - x) / SCALE + nX,
			0.1,
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
		})
	})
	grass.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true, grass: true })
	})
	flowers.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true, grass: true })
	})
}
export const spawnGroundAndTrees = (level: Level) => {
	// ! Ground
	const groundMesh = new Mesh(
		new PlaneGeometry(level.size.x, level.size.y, level.size.x, level.size.y),
		new (GroundMaterial(level.path, level.size.x, level.size.y))({ displacementMap: new CanvasTexture(level.heightMap), displacementScale: 30, displacementBias: 0 }),
	)
	groundMesh.material.displacementMap!.repeat.set(-1, -1)
	groundMesh.material.displacementMap!.wrapS = RepeatWrapping
	groundMesh.material.displacementMap!.wrapT = RepeatWrapping

	groundMesh.rotation.x = -Math.PI / 2
	spawnLight(level.size)

	groundMesh.receiveShadow = true
	ecs.add({
		model: groundMesh,
		inMap: true,
		bodyDesc: RigidBodyDesc.fixed().lockRotations(),
		colliderDesc: ColliderDesc.cuboid(level.size.x, 1, level.size.y),
		position: new Vector3(),
		ground: true,
		// ...bundle,
	})
	spawnTrees(level)
	spawnGrass(level)
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