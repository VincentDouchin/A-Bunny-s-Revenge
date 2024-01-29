import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { createNoise2D } from 'simplex-noise'
import { BoxGeometry, Mesh, Vector3 } from 'three'
import { enemyBundle } from '../dungeon/enemies'
import { spawnHouse } from '../farm/house'
import { playerBundle } from './spawnCharacter'
import { doorBundle } from './spawnDoor'
import type { EntityInstance, LayerInstance, Level } from '@/LDTKMap'
import { instanceMesh } from '@/global/assetLoaders'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import type { direction } from '@/lib/directions'
import { otherDirection } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { getRotationFromDirection } from '@/lib/transforms'
import { GroundMaterial } from '@/shaders/GroundShader'
import { getRandom, objectValues } from '@/utils/mapFunctions'

export const treeBundle = () => {
	const model = getRandom(objectValues(assets.trees)).scene.clone()
	model.scale.setScalar(between(1.5, 2))
	model.rotateY(between(0, Math.PI))
	return {
		inMap: true,
		parent,
		scale: 4,
		model,
	} as const
}

enum GroundType {
	Tree = 1,
	Grass = 2,
}
const SCALE = 7

interface FieldInstances {
	door: {
		direction: direction
	}
	level: {
		dungeon: boolean
	}
	house: Record<string, unknown>
}
type EntityData<K extends keyof FieldInstances> = FieldInstances[K] & { id: string }

export const getFieldIntances = <Name extends keyof FieldInstances>(entity: EntityInstance | Level) => {
	return entity.fieldInstances.reduce((acc, v) => {
		return { ...acc, [v.__identifier]: v.__value }
	}, { id: entity.iid } as EntityData<Name>)
}
const getEntityPosition = (entity: EntityInstance, layer: LayerInstance, offsetX = 0, offsetY = 0) => {
	return new Vector3(
		-entity.__grid[0] + layer.__cWid / 2 + offsetX,
		0,
		-entity.__grid[1] + layer.__cHei / 2 + offsetY,
	).multiplyScalar(SCALE)
}

export const spawnLDTKEntities = (constructors: { [key in keyof FieldInstances]?: (position: Vector3, data: EntityData<key>) => void }) => (layer: LayerInstance) => {
	for (const entityInstance of layer.entityInstances) {
		const position = getEntityPosition(entityInstance, layer)
		const name = entityInstance.__identifier as keyof FieldInstances
		const data = getFieldIntances(entityInstance)
		const constructor = constructors[name]
		constructor && constructor(position, data as any)
	}
}

const spawnFarmEntities = (_wasDungeon: boolean) => {
	return spawnLDTKEntities({
		door: (position, data) => {
			const rotation = getRotationFromDirection(data.direction)
			ecs.add({ ...doorBundle(1, data.direction), position, rotation })
		},

		house: spawnHouse,

	})
}
const spawnGroundAndTrees = (layer: LayerInstance) => {
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
	const noise = createNoise2D(() => 0)
	for (let i = 0; i < layer.intGridCsv.length; i++) {
		const val = layer.intGridCsv[i]
		if (val === GroundType.Tree) {
			const x = i % layer.__cWid
			const y = Math.floor(i / layer.__cWid)
			const position = new Vector3(
				-x + layer.__cWid / 2 + noise(x, y),
				0,
				-y + layer.__cHei / 2 + noise(y, x),
			).multiplyScalar(SCALE)
			const tree = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const smol = layer.intGridCsv[x + (y - 1) * layer.__cWid] === GroundType.Grass
			tree.addAt(position, smol ? between(2, 3) : between(3, 4))
		}
	}
	trees.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true })
	})
}

export const spawnFarm: System<FarmRessources> = ({ previousState }) => {
	const level = assets.levels.levels.find(l => l.identifier === 'farm')!
	ecs.add({ map: 'farm' })
	for (const layer of level.layerInstances!) {
		switch (layer.__type) {
			case 'IntGrid': {
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			}; break
			case 'Entities': {
				spawnFarmEntities(previousState === 'dungeon')(layer)
			}; break
		}
	}
}
export const spawnDungeon: System<DungeonRessources> = ({ dungeon, direction, roomIndex }) => {
	const room = dungeon.rooms[roomIndex]
	ecs.add({ map: room.plan.iid })

	for (const enemy of room.enemies) {
		ecs.add({
			...enemyBundle(enemy),
			position: new Vector3(between(-10, 10), 0, between(-10, 10)),
		})
	}

	for (const layer of room.plan.layerInstances!) {
		switch (layer.__type) {
			case 'IntGrid':{
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			};break
			case 'Entities':{
				for (const entity of layer.entityInstances) {
					const position = getEntityPosition(entity, layer)
					if (entity.__identifier === 'door') {
						const doorData = getFieldIntances<'door'>(entity)
						const dungeonDoor = room.doors.find(d => d.direction === doorData.direction)
						if (dungeonDoor) {
							ecs.add({
								...doorBundle(dungeonDoor.to, dungeonDoor.direction),
								position,
							})
						}
						if (doorData.direction === otherDirection[direction]) {
							ecs.add({
								...playerBundle(),
								position: position.clone(),
								ignoreDoor: doorData.direction,
							})
						}
					}
				}
			}
		}
	}
}