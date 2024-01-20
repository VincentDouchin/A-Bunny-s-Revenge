import type { models } from '@assets/assets'
import type { LevelData } from './LevelEditor'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { menuInputMap } from '@/global/inputMaps'
import { inventoryBundle } from '@/states/game/inventory'

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
]