import type { items } from '@assets/assets'
import type { crops } from '@/global/entity'
import { ModStage, ModType, type Modifier, createModifier } from '@/lib/stats'

export interface Item {
	name: items
	quantity: number
}

export type ItemTags = 'choppable' | 'cookable'
export type ItemData = Partial<Record<ItemTags, true>> & {
	name: string
	seed?: crops
	meal?: Modifier[]
}

export const itemsData: Record<items, ItemData> = {
	beet: {
		name: 'Beet',
		choppable: true,
	},
	carrot: {
		name: 'Carrot',
		cookable: true,
		choppable: true,
	},
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: [createModifier('strength', 1, ModStage.Base, ModType.Percent)],
	},
	mushroom: {
		name: 'Mushroom',
		choppable: true,
	},
	carrot_soup: {
		name: 'Carrot soup',
		meal: [],
	},
	carrot_seeds: {
		name: 'Carrot seed',
		seed: 'carrot',
	},
	beet_seeds: {
		name: 'Beet seed',
		seed: 'beet',
	},

}
