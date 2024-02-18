import type { models } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { Object3D, Object3DEventMap } from 'three'
import { Quaternion, Vector3 } from 'three'
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
import { stateBundle } from '@/lib/stateMachine'
import { cropBundle } from '@/states/farm/farming'
import { playerBundle } from '@/states/game/spawnPlayer'
import { doorSide } from '@/states/game/spawnDoor'
import { doorClosed } from '@/particles/doorClosed'

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
type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'cauldron' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence' | 'house' | 'mushrooms'
export const props: PlacableProp<propNames>[] = [
	{
		name: 'log',
		models: ['WoodLog', 'WoodLog_Moss'],
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
			menuType: MenuType.Quest,
			...menuInputMap(),
		}),
	},
	{
		name: 'oven',
		models: ['StoneOven', 'BunnyOvenPacked'],
		bundle: (entity) => {
			return {
				...entity,
				...menuInputMap(),
				recipesQueued: [],
				ovenAnimator: new Animator(entity.model, assets.models.BunnyOvenPacked.animations),
				...stateBundle<'doorOpening' | 'idle'>('idle', {
					idle: ['doorOpening'],
					doorOpening: ['idle'],
				}),
				minigameContainer: new CSS2DObject(document.createElement('div')),
				withChildren(parent) {
					ecs.add({
						...modelColliderBundle(assets.models.Bellow.scene, RigidBodyType.Fixed, true),
						parent,
						interactable: Interactable.Cook,
						position: new Vector3(10, 0, 0),
						rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
						oven: parent as With<Entity, 'model' | 'recipesQueued'>,
						menuType: MenuType.OvenMinigame,
					})
				},
				menuType: MenuType.Oven,
				interactable: Interactable.Cook,
			} },
	},
	{
		name: 'cauldron',
		models: ['cauldron'],
		bundle: entity => ({
			...entity,
			...menuInputMap(),
			menuType: MenuType.Cauldron,
			interactable: Interactable.Cauldron,
			recipesQueued: [],
		}),
	},
	{
		name: 'stove',
		models: ['Stove1'],
		bundle: entity => ({
			...entity,
			...menuInputMap(),
			menuType: MenuType.Oven,
			interactable: Interactable.Cook,
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
				if (data.data.direction === ressources.direction) {
					ecs.add({
						...playerBundle(ressources.playerHealth),
						position: new Vector3(...data.position).add(new Vector3(0, 0, -20).applyQuaternion(entity.rotation)),
						ignoreDoor: data.data.direction,
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
			entity.model.traverse((node) => {
				if (node.name === 'door') {
					node.removeFromParent()
					node.scale.set(...entity.model.scale.clone().toArray())
					const position = node.position.clone().multiply(entity.model.scale)
					node.position.setScalar(0)
					entity.withChildren = (parent) => {
						ecs.add({
							parent,
							npcName: 'door',
							position,
							model: node,
							dialog: dialogs.GrandmasDoor(),
							interactable: Interactable.Enter,
							bodyDesc: RigidBodyDesc.fixed().lockRotations(),
							colliderDesc: ColliderDesc.cuboid(5, 7, 1).setSensor(false),
						})
					}
				}
			})
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