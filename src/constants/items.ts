import type { items } from '@assets/assets'

export interface Item {
	name: items
	quantity: number
}

export type ItemTags = 'choppable' | 'cookable' | 'meal' | 'seed'
export type ItemData = Partial<Record<ItemTags, true>>

export const itemsData: Record<items, ItemData> = {
	beet: {
		choppable: true,
	},
	carrot: {
		cookable: true,
		choppable: true,
	},
	roasted_carrot: {
		meal: true,
	},
	mushroom: {
		choppable: true,
	},
	carrot_soup: {
		meal: true,
	},
	carrot_seeds: {
		seed: true,
	},

}
