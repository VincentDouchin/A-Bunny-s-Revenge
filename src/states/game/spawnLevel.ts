import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { createNoise3D } from 'simplex-noise'
import { BoxGeometry, Euler, Mesh, Quaternion, Vector3 } from 'three'
import { enemyBundle } from '../dungeon/enemies'
import type { EntityInstance, LayerInstance, Level } from '@/LDTKMap'
import { getModel, props } from '@/debug/props'
import { instanceMesh } from '@/global/assetLoaders'
import { assets, ecs, levelsData } from '@/global/init'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { getBoundingBox, modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { GroundMaterial } from '@/shaders/GroundShader'

enum GroundType {
	Tree = 1,
	Grass = 2,
}
const SCALE = 10

interface FieldInstances {

	level: {
		dungeon: boolean
	}
}
type EntityData<K extends keyof FieldInstances> = FieldInstances[K] & { id: string }

export const getFieldIntances = <Name extends keyof FieldInstances>(entity: EntityInstance | Level) => {
	return entity.fieldInstances.reduce((acc, v) => {
		return { ...acc, [v.__identifier]: v.__value }
	}, { id: entity.iid } as EntityData<Name>)
}

export const spawnGroundAndTrees = (layer: LayerInstance) => {
	// ! Ground
	const w = layer.__cWid * SCALE
	const h = layer.__cHei * SCALE
	const groundMesh = new Mesh(
		new BoxGeometry(w, 1, h),
		new GroundMaterial({ color: 0x26854C }),
	)

	groundMesh.receiveShadow = true
	const bundle = modelColliderBundle(groundMesh, RigidBodyType.Fixed)
	ecs.add({
		inMap: true,
		position: new Vector3(),
		...bundle,
	})
	const trees = Object.values(assets.trees).map(instanceMesh)
	const noise = createNoise3D(() => 0)
	for (let i = 0; i < layer.intGridCsv.length; i++) {
		const val = layer.intGridCsv[i]
		if (val === GroundType.Tree) {
			const x = i % layer.__cWid
			const y = Math.floor(i / layer.__cWid)
			const position = new Vector3(
				-x + layer.__cWid / 2 + noise(x, y, y),
				0,
				-y + layer.__cHei / 2 + noise(y, x, x),
			).multiplyScalar(SCALE)
			const treeGenerator = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const instanceHandle = treeGenerator.addAt(position, 3 + (2 * Math.abs(noise(x, y, x))), new Euler(0, noise(x, y, x), 0))
			ecs.add({ position, tree: true, instanceHandle })
		}
	}
	trees.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true })
	})
}
const playerQuery = ecs.with('player', 'position')
const treeQuery = ecs.with('tree', 'position', 'instanceHandle')
export const updateTreeOpacity = () => {
	for (const player of playerQuery) {
		for (const tree of treeQuery) {
			if (tree.position.z < player.position.z) {
				tree.instanceHandle.setUniform('playerZ', 1)
			} else {
				tree.instanceHandle.setUniform('playerZ', 0)
			}
		}
	}
}

export const spawnFarm: System<FarmRessources> = () => {
	const level = assets.levels.levels.find(l => l.identifier === 'farm')!
	ecs.add({ map: level.iid })
	for (const layer of level.layerInstances!) {
		switch (layer.__type) {
			case 'IntGrid': {
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			}; break
		}
	}
}
export const spawnDungeon: System<DungeonRessources> = ({ dungeon }) => {
	ecs.add({ map: dungeon.plan.iid })
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemyBundle(enemy),
			position: new Vector3(between(-10, 10), 0, between(-10, 10)),
		})
	}
	for (const layer of dungeon.plan.layerInstances!) {
		switch (layer.__type) {
			case 'IntGrid':{
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			};break
		}
	}
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
				const bundle = bundleFn ? bundleFn(entityId, entityData, ressources) : {}
				ecs.add({
					rotation,
					position,
					...bundle,
					...getBoundingBox(entityData.model, model, colliderData),
					entityId,
					model,
					inMap: true,

				})
			}
		}
	}
}