import type { models } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import type { LevelData } from './LevelEditor'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { menuInputMap } from '@/global/inputMaps'
import { inventoryBundle } from '@/states/game/inventory'
import { save } from '@/global/save'
import { assets, ecs } from '@/global/init'
import { cropBundle } from '@/states/farm/farming'

export interface PlacableProp {
	name: string
	models: models[]
	bundle?: (id: string, data: LevelData[string]) => Entity
}

export const props: PlacableProp[] = [
	{
		name: 'log',
		models: ['WoodLog'],
	},
	{
		name: 'rock',
		models: ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_4', 'Rock_5', 'Rock_6', 'Rock_7'],
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
		name: 'plots',
		models: ['gardenPlot1', 'gardenPlot2', 'gardenPlot3'],
		bundle: (id) => {
			const crop = save.crops[id]
			const entity: Entity = {
				plantableSpot: id,
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),

			}
			if (crop) {
				entity.withChildren = (parent) => {
					const planted = ecs.add({
						parent,
						...cropBundle(false, crop),
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
]