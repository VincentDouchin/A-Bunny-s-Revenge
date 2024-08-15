import type { icons } from '@assets/assets'
import type { Item } from './items'

export interface QuestStep {
	description?: string
	items?: readonly Item[]
	icon?: icons
	key: string
}
export interface Quest {
	unlock: () => boolean
	readonly name: string
	readonly description?: string
	readonly steps: ReadonlyArray<QuestStep>
}

export const quests = {
	intro_quest: {
		unlock: () => true,
		name: 'Cook a meal for the festival',
		steps: [{
			key: '0_find_basket',
			description: 'Find your basket of ingredients',
			items: [],
		}, {
			key: '1_see_grandma',
			description: 'Talk to grandma',
			items: [],
		}, {
			key: '2_find_pot',
			description: 'Find the cooking pot in the cellar',
			items: [],
		}, {
			key: '3_bring_pot_to_grandma',
			description: 'Bring the pot',
			items: [],
		}, {
			key: '4_get_carrots',
			description: 'Get some carrots for the meal',
			items: [],
		}, {
			key: '5_cook_meal',
			description: 'Make a carrot soup for the festival',
			items: [],
		}],
	},
	// grandma_start: {
	// 	name: 'Host Matser Owl for dinner',
	// 	steps: [{
	// 		key: 'trout and lemons',
	// 		items: [
	// 			{ name: 'redSnapper', quantity: 1 },
	// 			{ name: 'lemon', quantity: 3 },
	// 		],
	// 	}],
	// },
	// grandma_1: {
	// 	name: 'Bring grandma some roasted carrots',
	// 	steps: [{
	// 		key: 'giveCarrot',
	// 		items: [{ name: 'roasted_carrot', quantity: 6 }],
	// 	}],
	// },
	// jack_1: {
	// 	name: 'Bring Jack some carrot soup',
	// 	steps: [{
	// 		key: 'giveSoup',
	// 		items: [{ name: 'carrot_soup', quantity: 1 }],
	// 	}],
	// },
	// alice_1: {
	// 	name: 'Make a Alice bigger',
	// 	steps: [
	// 		{
	// 			key: 'plantBean',
	// 			items: [{ name: 'magic_bean', quantity: 1 }],
	// 			description: 'plant the magic bean',
	// 		},
	// 		{
	// 			key: 'makeHummus',
	// 			items: [{ name: 'hummus', quantity: 1 }],
	// 			description: 'Give the magic hummus dish to Alice',
	// 		},
	// 	],
	// },
} as const satisfies Record<string, Quest>
export type QuestName = keyof typeof quests
export type QuestStepKey<N extends QuestName> = (typeof quests)[N]['steps'][number]['key']
export type QuestMarkers = { [k1 in QuestName]: { [k2 in QuestStepKey<k1>]: `${k1}#${k2}` }[QuestStepKey<k1>] }[QuestName]