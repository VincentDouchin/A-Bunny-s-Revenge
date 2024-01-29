import type { Item } from './items'
import { MenuType } from '@/global/entity'

export interface Recipe {
	input: Item[]
	output: Item
	processor: MenuType
}

export const recipes: Array<Recipe> = [
	{
		input: [{ name: 'carrot', quantity: 3 }],
		output: { name: 'carrot_soup', quantity: 1 },
		processor: MenuType.Cauldron,
	},
	{
		input: [{ name: 'tomato', quantity: 3 }, { name: 'parsley', quantity: 1 }],
		output: { name: 'tomato_soup', quantity: 1 },
		processor: MenuType.Cauldron,
	},
	{
		input: [{ name: 'carrot', quantity: 3 }],
		output: { name: 'roasted_carrot', quantity: 3 },
		processor: MenuType.Oven,
	},
	{
		input: [{ name: 'carrot', quantity: 1 }, { name: 'honey', quantity: 2 }],
		output: { name: 'honey_glazed_carrot', quantity: 1 },
		processor: MenuType.Oven,
	},
]