import type { weapons } from '@assets/assets'

interface Weapon {
	scale: number
	attack: number
	knockBack: number
}

export const weaponsData: Record<weapons, Weapon> = {
	Hoe: {
		scale: 1,
		attack: 1,
		knockBack: 1,
	},
	Ladle: {
		scale: 2,
		attack: 1,
		knockBack: 1,
	},
	ScissorWeapon: {
		scale: 1.5,
		attack: 1,
		knockBack: 1,
	},
	SwordWeapon: {
		scale: 2,
		attack: 1,
		knockBack: 1,
	},
}