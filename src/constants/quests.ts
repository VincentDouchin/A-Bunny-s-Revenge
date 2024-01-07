import type { ItemData } from './items'

export interface Quest {
	name: string
	description?: string
	steps: Array<{ description?: string, items?: readonly ItemData[] }>
}
export const questNames = ['grandma_1'] as const
export type QuestName = (typeof questNames)[number]
export const quests: Record<QuestName, Quest> = {
	grandma_1: {
		name: 'Bring grandma some roasted carrots',
		steps: [{
			items: [{ icon: 'roasted_carrot', quantity: 6 }],
		}],
	},
}