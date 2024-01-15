import type { items } from '@assets/assets'
import type { crops } from '@/global/entity'

export interface Item {
	name: items
	quantity: number
}

export type ItemTags = 'choppable' | 'cookable' | 'meal'
export type ItemData = Partial<Record<ItemTags, true>> & {
	seed?: crops
}

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
		seed: 'carrot',
	},
	beet_seeds: {
		seed: 'beet',
	},

}
