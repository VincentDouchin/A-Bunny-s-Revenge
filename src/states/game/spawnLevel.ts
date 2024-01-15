import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { createNoise2D } from 'simplex-noise'
import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three'
import { RoomType } from '../dungeon/dungeonTypes'
import { enemyBundle } from '../dungeon/enemies'
import { cropBundle } from '../farm/farming'
import { spawnHouse } from '../farm/house'
import { kitchenApplianceBundle } from '../farm/kitchen'
import { playerBundle } from './spawnCharacter'
import { doorBundle } from './spawnDoor'
import type { EntityInstance, LayerInstance, Level } from '@/LDTKMap'
import { instanceMesh } from '@/global/assetLoaders'
import { Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import type { direction } from '@/lib/directions'
import { otherDirection } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { getRotationFromDirection } from '@/lib/transforms'
import { GroundShader } from '@/shaders/GroundShader'
import { inventoryBundle } from '@/states/game/inventory'
import { getRandom, objectValues, range } from '@/utils/mapFunctions'

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
	// counter: {
	// 	direction: direction
	// 	cutting_board: boolean
	// }
	oven: {
		direction: direction
	}
	level: {
		dungeon: boolean
	}
	house: Record<string, unknown>
	board: Record<string, unknown>
	cauldron: Record<string, unknown>
	planter: Record<string, unknown>
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
		constructors[name]!(position, data as any)
	}
}

const spawnFarmEntities = (wasDungeon: boolean) => {
	return spawnLDTKEntities({
		door: (position, data) => {
			const rotation = getRotationFromDirection(data.direction)
			ecs.add({ ...doorBundle(1, data.direction), position, rotation })
		},
		cauldron: (position) => {
			ecs.add({
				...inventoryBundle(MenuType.Oven, 3, 'oven1', Interactable.Cook),
				...kitchenApplianceBundle('Stove1', 'front', 15),
				position,
			})
		},
		oven: (position, data) => {
			ecs.add({
				...inventoryBundle(MenuType.Oven, 3, 'oven1', Interactable.Cook),
				...kitchenApplianceBundle('StoneOven', data.direction, 15),
				position,
			})
		},

		planter: (position, data) => {
			const model = new Mesh(
				new PlaneGeometry(60, 8),
				new MeshStandardMaterial({ color: 0x996633 }),
				// new PlanterMaterial({ color: 0x996633, size: new Vector2(60, 8) }),
			)
			model.rotation.x = -Math.PI / 2
			model.position.y = 1
			model.receiveShadow = true
			const planter = ecs.add({ position, model, inMap: true })
			for (let i = 0; i < 50; i += 10) {
				const key = data.id + i
				const crop = save.crops[key]
				const spot = ecs.add({
					position: new Vector3(i - 20, 2),
					group: new Group(),
					parent: planter,
					bodyDesc: RigidBodyDesc.fixed(),
					colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),
					plantableSpot: key,
				})
				if (crop) {
					const planted = ecs.add({
						parent: spot,
						position: new Vector3(),
						...cropBundle(wasDungeon, crop),
					})
					ecs.update(spot, { planted })
				}
			}
		},
		// counter: (position, data) => {
		// 	const counter = ecs.add({ position, ...kitchenApplianceBundle('kitchencounter_straight_B', data.direction) })
		// 	if (data.cutting_board) {
		// 		ecs.update(counter, inventoryBundle(MenuType.CuttingBoard, 1, 'cuttingBoard1', Interactable.Chop))
		// 		const model = assets.models.cutting_board.scene.clone()
		// 		model.scale.setScalar(4)
		// 		ecs.add({
		// 			parent: counter,
		// 			model,
		// 			position: new Vector3(0, counter.size.y, 0),
		// 		})
		// 	}
		// },
		house: spawnHouse,
		board: (position) => {
			const model = assets.models.Bulliten.scene
			model.scale.setScalar(15)
			const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
			const bundle = modelColliderBundle(model, RigidBodyType.Fixed, false)
			ecs.add({
				...bundle,
				position,
				model,
				rotation,
				inMap: true,
				interactable: Interactable.BulletinBoard,
				menuType: MenuType.Quest,
				...menuInputMap(),
			})
		},
	})
}
const spawnGroundAndTrees = (layer: LayerInstance) => {
	// ! Ground
	const w = layer.__cWid * SCALE
	const h = layer.__cHei * SCALE
	const groundMesh = new Mesh(
		new BoxGeometry(w, 1, h),
		new GroundShader(new Color(0x26854C)),
	)
	groundMesh.receiveShadow = true
	ecs.add({
		inMap: true,
		mesh: groundMesh,
		position: new Vector3(),
		...modelColliderBundle(groundMesh, RigidBodyType.Fixed),
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
				y - layer.__cHei / 2 + noise(y, x),
			).multiplyScalar(SCALE)
			const tree = trees[Math.floor(trees.length * Math.abs(Math.sin((x + y) * 50 * (x - y))))]
			const smol = layer.intGridCsv[x + (y - 1) * layer.__cWid] === GroundType.Grass
			tree.addAt(position, smol ? between(5, 8) : between(8, 10))
		}
	}
	trees.forEach((t) => {
		const group = t.process()
		ecs.add({ group, inMap: true })
	})
}

export const spawnFarm: System<FarmRessources> = ({ previousState }) => {
	const level = assets.levels.levels.find(l => l.identifier === 'farm')!
	for (const layer of level.layerInstances!) {
		ecs.add({ map: true })
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
	ecs.add({ map: true })
	const room = dungeon.rooms[roomIndex]
	if (room.type === RoomType.Entrance) {
		for (const _ in range(0, 5)) {
			ecs.add({
				...enemyBundle('Armabee'),
				position: new Vector3(between(-10, 10), 0, between(-10, 10)),
			})
		}
	}
	if (room.type === RoomType.Boss) {
		const model = assets.characters.Armabee_Evolved.scene
		model.scale.setScalar(4)
		ecs.add({
			...enemyBundle('Armabee_Evolved'),
			position: new Vector3(),
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