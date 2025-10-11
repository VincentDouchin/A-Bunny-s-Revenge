import type { AssetNames } from '@/global/entity'

interface Weapon {
	scale: number
	attack: number
	knockBack: number
	attackSpeed: number
	name: string
}

export const weaponsData: Record<AssetNames['weapons'], Weapon> = {
	Hoe: {
		scale: 1,
		attack: 1,
		knockBack: 1,
		name: 'Hoe',
		attackSpeed: 1,
	},
	Ladle: {
		scale: 2,
		attack: 1,
		knockBack: 1,
		name: 'Ladle',
		attackSpeed: 1,
	},
	ScissorWeapon: {
		scale: 1.5,
		attack: 1,
		knockBack: 1,
		name: 'Scissor',
		attackSpeed: 1,
	},
	SwordWeapon: {
		scale: 2,
		attack: 1,
		knockBack: 1,
		name: 'Bunny Sword',
		attackSpeed: 1,
	},
}