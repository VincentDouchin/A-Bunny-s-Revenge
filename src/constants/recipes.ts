import type { ItemData } from './items'

export const recipes: Array<{ input: items[], output: ItemData }> = [
	{
		input: ['carrot', 'carrot', 'carrot', 'carrot'],
		output: { icon: 'carrot_soup', quantity: 1 },
	},
]