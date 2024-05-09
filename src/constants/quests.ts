import type { icons } from '@assets/assets'
import type { Item } from './items'

export interface QuestStep {
	description?: string
	items?: readonly Item[]
	icon?: icons
	key: string
}
export interface Quest {
	name: string
	description?: string
	steps: Array<QuestStep>
}

export const quests = {
	grandma_1: {
		name: 'Bring grandma some roasted carrots',
		steps: [{
			key: 'giveCarrot',
			items: [{ name: 'roasted_carrot', quantity: 6 }],
		}],
	},
	jack_1: {
		name: 'Bring Jack some carrot soup',
		steps: [{
			key: 'giveSoup',
			items: [{ name: 'carrot_soup', quantity: 1 }],
		}],
	},
	alice_1: {
		name: 'Make a Alice bigger',
		steps: [
			{
				key: 'plantBean',
				items: [{ name: 'magic_bean', quantity: 1 }],
				description: 'plant the magic bean',
			},
			{
				key: 'makeHummus',
				items: [{ name: 'hummus', quantity: 1 }],
				description: 'Give the magic hummus dish to Alice',
			},
		],
	},
} as const satisfies Record<string, Quest>
export type QuestName = keyof typeof quests
export type QuestStepKey<N extends QuestName> = (typeof quests)[N]['steps'][number]['key']