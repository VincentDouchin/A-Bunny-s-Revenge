import type { Item } from './items'

export interface Quest {
	name: string
	description?: string
	steps: Array<{ description?: string, items?: readonly Item[] }>
}
export const questNames = ['grandma_1', 'jack_1'] as const
export type QuestName = (typeof questNames)[number]
export const quests: Record<QuestName, Quest> = {
	grandma_1: {
		name: 'Bring grandma some roasted carrots',
		steps: [{
			items: [{ name: 'roasted_carrot', quantity: 6 }],
		}],
	},
	jack_1: {
		name: 'Bring Jack some carrot soup',
		steps: [{
			items: [{ name: 'carrot_soup', quantity: 1 }],
		}],
	},
}