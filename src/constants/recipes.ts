import type { ItemData } from './items'

interface Recipe {
	input: items[]
	output: ItemData
	processor: 'oven' | 'cutting_board' | 'cauldron'
}

export const recipes: Array<Recipe> = [
	{
		input: ['carrot', 'carrot', 'carrot', 'carrot'],
		output: { icon: 'carrot_soup', quantity: 1 },
		processor: 'cauldron',
	},
	{
		input: ['carrot', 'carrot', 'carrot'],
		output: { icon: 'roasted_carrot', quantity: 3 },
		processor: 'oven',
	},
]