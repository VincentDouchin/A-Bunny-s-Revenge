import type { characters, items } from '@assets/assets'

export interface Drop {
	item: items
	quantity: () => number
}
interface Enemy {
	health: number
	scale: number
	drops: Drop[]
}
const enemyNames = ['Armabee', 'Armabee_Evolved'] as const satisfies readonly characters[]
export type enemies = (typeof enemyNames)[number]
export const enemyData: Record<enemies, Enemy> = {
	Armabee: {
		health: 3,
		scale: 4,
		drops: [{ item: 'honey', quantity: () => Math.random() < 0.5 ? 1 : 0 }],
	},
	Armabee_Evolved: {
		health: 5,
		scale: 5,
		drops: [],
	},
}