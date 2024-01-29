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
	meal?: Modifier<any>[]
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
	tomato: {
		name: 'Tomato',
		cookable: true,
	},
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: [
			createModifier('strength', 1, ModStage.Base, ModType.Percent, true),
		],
	},
	mushroom: {
		name: 'Mushroom',
		choppable: true,
	},
	carrot_soup: {
		name: 'Carrot soup',
		meal: [
			createModifier('maxHealth', 20, ModStage.Add, ModType.Percent, true),
			createModifier('strength', -2, ModStage.Total, ModType.Percent, true),
		],
	},
	tomato_soup: {
		name: 'Tomato soup',
		meal: [
			createModifier('maxHealth', 20, ModStage.Add, ModType.Percent, true),
			createModifier('strength', -2, ModStage.Total, ModType.Percent, true),
		],
	},
	carrot_seeds: {
		name: 'Carrot seed',
		seed: 'carrot',
	},
	beet_seeds: {
		name: 'Beet seed',
		seed: 'beet',
	},
	tomato_seeds: {
		name: 'Tomato seeds',
		seed: 'tomato',
	},
	lettuce_seeds: {
		name: 'Lettuce seeds',
		seed: 'lettuce',
	},
	lettuce: {
		name: 'Lettuce',
	},
	honey: {
		name: 'Honey',
		cookable: true,
	},
	honey_glazed_carrot: {
		name: 'Honey glazed carrot',
		meal: [
			createModifier('strength', 2, ModStage.Base, ModType.Percent, true),
			createModifier('maxHealth', 1, ModStage.Total, ModType.Add, true),
		],
	},
	parsley: {
		name: 'Parsley',
	},
	beetroot_salad: {
		name: 'Beetroot Salad',
		meal: [
			createModifier('strength', 2, ModStage.Base, ModType.Add, false),
		],
	},
	ham: {
		name: 'Ham',
	},
	ham_honey: {
		name: 'Honey Ham',
		meal: [
			createModifier('maxHealth', 3, ModStage.Base, ModType.Add, true),
		],
	},

}
