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
export const enemies = {
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
} as const satisfies Partial<Record<characters, Enemy>>