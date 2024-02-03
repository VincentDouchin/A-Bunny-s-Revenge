import type { models } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Vector3 } from 'three'
import type { EntityData } from './LevelEditor'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import type { direction } from '@/lib/directions'
import { cropBundle } from '@/states/farm/farming'
import { inventoryBundle } from '@/states/game/inventory'
import { playerBundle } from '@/states/game/spawnCharacter'
import { doorGroup } from '@/states/game/spawnDoor'

export const customModels = {
	door: doorGroup,
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

type BundleFn<E extends EntityData<any>> = (id: string, data: NonNullable<E>, ressources: FarmRessources | DungeonRessources) => Entity

export interface PlacableProp<N extends string> {
	name: N
	models: (models | customModel)[]
	data?: N extends keyof ExtraData ? ExtraData[N] : undefined
	bundle?: BundleFn<EntityData<N extends keyof ExtraData ? NonNullable<ExtraData[N]> : never>>
}
type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'cauldron' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence'
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
		bundle: () => ({
			interactable: Interactable.BulletinBoard,
			menuType: MenuType.Quest,
			...menuInputMap(),
		}),
	},
	{
		name: 'oven',
		models: ['StoneOven', 'BunnyOvenPacked'],
		bundle: id => ({
			...inventoryBundle(MenuType.Oven, 3, id, Interactable.Cook),
		}),
	},
	{
		name: 'cauldron',
		models: ['cauldron'],
		bundle: id => ({
			...inventoryBundle(MenuType.Cauldron, 0, id, Interactable.Cook),
		}),
	},
	{
		name: 'stove',
		models: ['Stove1'],
		bundle: id => ({
			...inventoryBundle(MenuType.Oven, 3, id, Interactable.Cook),
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
		bundle: (id, _, ressources) => {
			const crop = save.crops[id]
			const entity: Entity = {
				plantableSpot: id,
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),
			}
			if (crop) {
				const grow = 'previousState' in ressources && ressources.previousState === 'dungeon'
				entity.withChildren = (parent) => {
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
			return entity
		},
	},
	{
		name: 'Flower/plants',
		models: ['SM_Env_Flower_01', 'SM_Env_Flower_02', 'SM_Env_Flower_03', 'SM_Env_Flower_04', 'SM_Env_Flower_05', 'SM_Env_Flower_06', 'SM_Env_Flower_07', 'SM_Env_Flower_08', 'SM_Env_Grass_01', 'SM_Env_Grass_02'],
	},
	{
		name: 'door',
		data: { direction: 'north' },
		models: ['door'],
		bundle: (_id, data, ressources) => {
			if ('dungeon' in ressources) {
				if (data.data.direction === ressources.direction) {
					ecs.add({
						...playerBundle(),
						position: new Vector3(...data.position),
						ignoreDoor: data.data.direction,
					})
				}
			}
			return { door: data.data.direction }
		},
	},
]