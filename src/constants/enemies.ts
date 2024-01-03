interface Enemy {
	health: number
	scale?: number
}
export const enemies = {
	Armabee: {
		health: 3,
		scale: 4,
	},
} as const satisfies Partial<Record<characters, Enemy>>