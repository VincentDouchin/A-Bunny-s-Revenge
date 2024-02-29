import type { models } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { Object3D, Object3DEventMap } from 'three'
import { Color, Group, Mesh, MeshPhongMaterial, PointLight, Quaternion, Vector3 } from 'three'

import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { EntityData } from './LevelEditor'
import { dialogs } from '@/constants/dialogs'
import { Animator } from '@/global/animator'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import { type DungeonRessources, type FarmRessources, campState } from '@/global/states'
import type { direction } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import { doorClosed } from '@/particles/doorClosed'
import { RoomType } from '@/states/dungeon/generateDungeon'
import { cropBundle } from '@/states/farm/farming'
import { openMenu } from '@/states/farm/openInventory'
import { doorSide } from '@/states/game/spawnDoor'
import { playerBundle } from '@/states/game/spawnPlayer'

export const customModels = {
	door: doorSide,
} as const satisfies Record<string, () => Object3D<Object3DEventMap>>
export type customModel = keyof typeof customModels
export const getModel = (key: models | customModel) => {
	if (key in customModels) {
		// @ts-expect-error okok
		return customModels[key]()
	}
	// @ts-expect-error okok
	return assets.models[key].scene.clone()
}
export interface ExtraData {
	door: {
		direction: direction
	}
}

type BundleFn<E extends EntityData<any>> = (entity: With<Entity, 'entityId' | 'model' | 'position' | 'rotation'>, data: NonNullable<E>, ressources: FarmRessources | DungeonRessources) => Entity

export interface PlacableProp<N extends string> {
	name: N
	models: (models | customModel)[]
	data?: N extends keyof ExtraData ? ExtraData[N] : undefined
	bundle?: BundleFn<EntityData<N extends keyof ExtraData ? NonNullable<ExtraData[N]> : never>>
}
type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'cauldron' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence' | 'house' | 'mushrooms' | 'lamp'
export const props: PlacableProp<propNames>[] = [
	{
		name: 'log',
		models: ['WoodLog', 'WoodLog_Moss', 'TreeStump', 'TreeStump_Moss'],
	},
	{
		name: 'rock',
		models: ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_4', 'Rock_5', 'Rock_6', 'Rock_7'],
	},
	{
		name: 'bush',
		models: ['Bush_1', 'Bush_2', 'SM_Env_Bush_01', 'SM_Env_Bush_02', 'SM_Env_Bush_03', 'SM_Env_Bush_04'],
	},
	{
		name: 'board',
		models: ['Bulliten'],
		bundle: entity => ({
			...entity,
			interactable: Interactable.BulletinBoard,
			onPrimary: openMenu(MenuType.Quest),
			...menuInputMap(),
		}),
	},
	{
		name: 'lamp',
		models: ['Lamp', 'Lamp2'],
		bundle(entity) {
			entity.withChildren = (parent) => {
				entity.model.traverse((node) => {
					if (node.name.includes('light')) {
						const nightLight = new PointLight(0xFFFF00, 1, 100, 0.01)
						node.add(nightLight)
						ecs.add({ parent, nightLight })
					}
					if (node.name.includes('bulb') && node instanceof Mesh && node.material instanceof MeshPhongMaterial) {
						node.material.emissive = new Color(0xFFFF00)
						node.material.emissiveIntensity = 1
						ecs.add({ parent, emissiveMat: node.material })
					}
				})
			}
			return entity
		},
	},
	{
		name: 'oven',
		models: ['StoneOven', 'BunnyOvenPacked'],
		bundle: (entity) => {
			const minigameContainer = new CSS2DObject(document.createElement('div'))
			minigameContainer.position.setX(-30)
			return {
				...entity,
				...menuInputMap(),
				recipesQueued: [],
				ovenAnimator: new Animator(entity.model, assets.models.BunnyOvenPacked.animations),
				minigameContainer,
				interactable: Interactable.Oven,
				onPrimary: openMenu(MenuType.Oven),
				onSecondary: openMenu(MenuType.OvenMinigame),

			} },
	},
	{
		name: 'cauldron',
		models: ['cauldron'],
		bundle: entity => ({
			...entity,
			...menuInputMap(),
			interactable: Interactable.Cauldron,
			onPrimary: e => ecs.addComponent(e, 'menuType', MenuType.Cauldron),
			onSecondary: e => ecs.addComponent(e, 'menuType', MenuType.CauldronGame),
			withChildren(parent) {
				const model = assets.models.spoon.scene.clone()
				const spoon = ecs.add({
					parent,
					model,
					position: new Vector3(),
					rotation: new Quaternion(),
				})
				ecs.update(parent, { spoon })
			},
			recipesQueued: [],

		}),
	},
	{
		name: 'stove',
		models: ['Stove1'],
		bundle: entity => ({
			...entity,
			...menuInputMap(),
			recipesQueued: [],
		}),
	},
	{
		name: 'sign',
		models: ['WoodenSign', 'WoodenSign2'],
	},
	{
		name: 'fence',
		models: ['Fence'],
	},
	{
		name: 'plots',
		models: ['gardenPlot1', 'gardenPlot2', 'gardenPlot3'],
		bundle: (entity, _, ressources) => {
			const crop = save.crops[entity.entityId]
			const newEntity: Entity = {
				...entity,
				plantableSpot: entity.entityId,
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),
			}
			if (crop) {
				const grow = 'previousState' in ressources && ressources.previousState === 'dungeon'
				newEntity.withChildren = (parent) => {
					const planted = ecs.add({
						parent,
						...cropBundle(grow, crop),
						position: new Vector3(),
					})
					const model = assets.models.plantedHole.scene.clone()
					model.scale.setScalar(15)

					ecs.update(parent, { planted })
				}
			}
			return newEntity
		},
	},
	{
		name: 'Flower/plants',
		models: ['SM_Env_Flower_01', 'SM_Env_Flower_02', 'SM_Env_Flower_03', 'SM_Env_Flower_05', 'SM_Env_Flower_06', 'SM_Env_Flower_07', 'SM_Env_Flower_08', 'SM_Env_Grass_01', 'SM_Env_Grass_02'],
	},
	{
		name: 'door',
		data: { direction: 'north' },
		models: ['door'],
		bundle: (entity, data, ressources) => {
			if (!campState.enabled) {
				entity.colliderDesc!.setSensor(false)
				entity.emitter = doorClosed()
			}
			if ('dungeon' in ressources) {
				const isStart = ressources.dungeon.type === RoomType.Entrance && ressources.firstEntry
				if (isStart ? ressources.dungeon.doors[data.data.direction] === null : data.data.direction === ressources.direction) {
					ecs.add({
						...playerBundle(ressources.playerHealth, ressources.firstEntry),
						position: new Vector3(...data.position).add(new Vector3(0, 0, -20).applyQuaternion(entity.rotation)),
						rotation: entity.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)),
					})
				}
			}
			return { door: data.data.direction, ...entity }
		},
	},
	{
		name: 'house',
		models: ['House'],
		bundle: (entity) => {
			entity.withChildren = (parent) => {
				entity.model.traverse((node) => {
					if (node.name.includes('window') && node instanceof Mesh && node.material instanceof MeshPhongMaterial) {
						node.material.emissive = new Color(0xFFFF00)
						node.material.emissiveIntensity = 1
						ecs.add({ parent, emissiveMat: node.material })
					}
					if (node.name.includes('light')) {
						const nightLight = new PointLight(0xFFFF00, 1, 30, 0.01)
						node.add(nightLight)
						ecs.add({ parent, nightLight })
					}
					if (node.name === 'door') {
						const position = node.position.clone().multiply(entity.model.scale)
						ecs.add({
							parent,
							npcName: 'door',
							position,
							group: new Group(),
							dialog: dialogs.GrandmasDoor(),
							interactable: Interactable.Enter,
							bodyDesc: RigidBodyDesc.fixed().lockRotations(),
							colliderDesc: ColliderDesc.cuboid(5, 7, 1).setSensor(true),
						})
					}
				})
			}
			return {
				...entity,
				dialogHeight: 4,
				npcName: 'Grandma',
				dialog: dialogs.GrandmasHouse(),
			}
		},
	},
	{
		name: 'mushrooms',
		models: ['Shroom1', 'Shroom2', 'Shroom3', 'Shroom4'],
	},
]