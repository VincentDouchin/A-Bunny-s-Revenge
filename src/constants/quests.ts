import type { icons } from '@assets/assets'
import type { Item } from './items'
import type { State } from '@/lib/state'
import { introQuest } from '@/global/states'

export interface QuestStep {
	description?: string
	items?: readonly Item[]
	icon?: icons
	key: string
}
export interface Quest {
	state?: State
	unlock: () => boolean
	data: () => object
	readonly name: string
	readonly description?: string
	readonly steps: ReadonlyArray<QuestStep>
}

export const quests = {
	intro_quest: {
		state: introQuest,
		unlock: () => true,
		data: () => ({
			'4_get_carrots': {
				planted: [] as string[],
				harvested: [] as string[],
				tuto: false,
			},
		}),
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
			items: [{ name: 'carrot', quantity: 4 }],
		}, {
			key: '5_cook_meal',
			description: 'Make a carrot soup for the festival',
			items: [],
		}],
	},
} as const satisfies Record<string, Quest>
export type QuestName = keyof typeof quests
export type QuestStepKey<N extends QuestName> = (typeof quests)[N]['steps'][number]['key']
export type QuestMarkers = { [k1 in QuestName]: { [k2 in QuestStepKey<k1>]: `${k1}#${k2}` }[QuestStepKey<k1>] }[QuestName]