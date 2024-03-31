import type { models, vegetation } from '@assets/assets'
import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { Object3D, Object3DEventMap } from 'three'
import { Color, Group, Mesh, MeshPhongMaterial, PointLight, Quaternion, Vector3 } from 'three'

import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import type { EntityData } from './LevelEditor'
import { dialogs } from '@/constants/dialogs'
import { Animator } from '@/global/animator'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { dungeonState, genDungeonState } from '@/global/states'

import type { direction } from '@/lib/directions'
import { doorClosed } from '@/particles/doorClosed'
import { cropBundle } from '@/states/farm/farming'
import { openMenu } from '@/states/farm/openInventory'
import { doorSide } from '@/states/game/spawnDoor'

export const customModels = {
	door: doorSide,
} as const satisfies Record<string, () => Object3D<Object3DEventMap>>
export type customModel = keyof typeof customModels
export const getModel = (key: models | customModel | vegetation) => {
	if (key in customModels) {
		// @ts-expect-error okok
		return customModels[key]()
	}
	if (key in assets.vegetation) {
		// @ts-expect-error okok
		return clone(assets.vegetation[key].scene)
	}
	// @ts-expect-error okok
	return clone(assets.models[key].scene)
}
export interface ExtraData {
	door: {
		direction: direction
		doorLevel: number
	}
}

type BundleFn<E extends EntityData<any>> = (entity: With<Entity, 'entityId' | 'model' | 'position' | 'rotation'>, data: NonNullable<E>, ressources: FarmRessources | DungeonRessources | void) => Entity

export interface PlacableProp<N extends string> {
	name: N
	models: (models | customModel | vegetation)[]
	data?: N extends keyof ExtraData ? ExtraData[N] : undefined
	bundle?: BundleFn<EntityData<N extends keyof ExtraData ? NonNullable<ExtraData[N]> : never>>
}
type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'CookingPot' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence' | 'house' | 'mushrooms' | 'lamp' | 'Kitchen'
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
		models: ['BunnyOvenPacked'],
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
				withChildren(parent) {
					const model = assets.models['ume-wood'].scene.clone()
					model.scale.setScalar(5)
					ecs.add({
						parent,
						model,
						position: new Vector3(),
					})
				},
			} },
	},
	{
		name: 'CookingPot',
		models: ['CookingPot'],
		bundle: entity => ({
			...entity,
			...menuInputMap(),
			interactable: Interactable.Cauldron,
			onPrimary: e => ecs.addComponent(e, 'menuType', MenuType.Cauldron),
			onSecondary: e => ecs.addComponent(e, 'menuType', MenuType.CauldronGame),
			withChildren(parent) {
				const spoonmodel = assets.models.spoon.scene.clone()
				const spoon = ecs.add({
					parent,
					model: spoonmodel,
					position: new Vector3(),
					rotation: new Quaternion(),
				})
				const woodmodel = assets.models['ume-wood'].scene.clone()
				woodmodel.scale.setScalar(5)
				ecs.add({
					parent,
					model: woodmodel,
					position: new Vector3(),
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
				bodyDesc: RigidBodyDesc.fixed().lockRotations(),
				colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),
			}
			if (crop && ressources) {
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
		models: ['SM_Env_Flower_01', 'SM_Env_Flower_02', 'SM_Env_Flower_03', 'SM_Env_Flower_05', 'SM_Env_Flower_06', 'SM_Env_Flower_07', 'SM_Env_Flower_08', 'SM_Env_Grass_01', 'SM_Env_Grass_02', 'grass&vines'],
	},
	{
		name: 'door',
		data: { direction: 'north', doorLevel: 0 },
		models: ['door'],
		bundle: (entity, data) => {
			if (dungeonState.enabled) {
				entity.colliderDesc!.setSensor(false)
				entity.emitter = doorClosed()
			}
			if (genDungeonState.enabled && data.data.direction === 'north') {
				entity.doorLevel = data.data.doorLevel
				entity.colliderDesc!.setSensor(false)
				entity.emitter = doorClosed()
			}

			return { door: data.data.direction, ...entity }
		},
	},
	{
		name: 'house',
		models: ['House'],
		bundle: (entity) => {
			return {
				...entity,
				withChildren: (parent) => {
					entity.model.traverse((node) => {
						if (node.name.includes('light')) {
							const nightLight = new PointLight(0xFFFF00, 1, 30, 0.01)
							node.add(nightLight)
							ecs.add({ parent, nightLight })
						} else if (node.name === 'door') {
							const position = node.position.clone().multiply(entity.model.scale)
							ecs.add({
								parent,
								npcName: 'door',
								position,
								group: new Group(),
								dialog: dialogs.GrandmasDoor(),
								interactable: Interactable.Enter,
								bodyDesc: RigidBodyDesc.fixed().lockRotations(),
								colliderDesc: ColliderDesc.cuboid(5, 7, 1).setSensor(true).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
							})
						} else if (node instanceof Mesh) {
							ecs.add({ parent, emissiveMat: node.material })
						}
					})
				},
				dialogHeight: 4,
				npcName: 'Grandma',
				houseAnimator: new Animator(entity.model, assets.models.House.animations),
				dialog: dialogs.GrandmasHouse(),
			}
		},
	},
	{
		name: 'mushrooms',
		models: ['Shroom1', 'Shroom2', 'Shroom3', 'Shroom4'],
	},
	{
		name: 'Kitchen',
		models: ['KitchenSet1', 'bench', 'table', 'stringLights', 'Bucket', 'well'],
	},
]