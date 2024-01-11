import type { characters } from '@assets/assets'

interface Enemy {
	health: number
	scale?: number
}
export const enemies = {
	Armabee: {
		health: 3,
		scale: 4,
	},
	Armabee_Evolved: {
		health: 5,
		scale: 5,
	},
} as const satisfies Partial<Record<characters, Enemy>>