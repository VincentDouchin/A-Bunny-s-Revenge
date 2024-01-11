import type { items } from '@assets/assets'
import type { Item } from './items'

interface Recipe {
	input: items[]
	output: Item
	processor: 'oven' | 'cutting_board' | 'cauldron'
}

export const recipes: Array<Recipe> = [
	{
		input: ['carrot', 'carrot', 'carrot', 'carrot'],
		output: { name: 'carrot_soup', quantity: 1 },
		processor: 'cauldron',
	},
	{
		input: ['carrot', 'carrot', 'carrot'],
		output: { name: 'roasted_carrot', quantity: 3 },
		processor: 'oven',
	},
]