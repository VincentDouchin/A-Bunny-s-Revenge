import type { models } from '@assets/assets'
import { type Entity, Interactable, MenuType } from '@/global/entity'
import { menuInputMap } from '@/global/inputMaps'

export interface PlacableProp {
	name: string
	models: models[]
	bundle?: () => Entity
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
]