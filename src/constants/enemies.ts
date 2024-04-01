import type { characters } from '@assets/assets'
import type { Item } from './items'
import { Rarity } from './items'

import type { Animator } from '@/global/animator'
import type { ComponentsOfType } from '@/global/entity'
import { getRandom, range } from '@/utils/mapFunctions'

export const lootPool = (lootQuantity: number, lootRarity: number, drops: Drop[]) => {
	const pool = drops.flatMap(drop => range(0, drop.quantity, () => ({ name: drop.name, rarity: drop.rarity })))
	const extraLoot = Math.floor(lootQuantity) + Math.random() < lootQuantity % 1 ? 1 : 0
	pool.push(...range(0, extraLoot).map(() => getRandom(drops)))
	const loot: Item[] = []
	for (const possibleLoot of pool) {
		const roll = Math.random() * 100
		const chance = possibleLoot.rarity + (lootRarity * 100)
		if (roll < chance) {
			loot.push({ name: possibleLoot.name, quantity: 1 })
		}
	}
	return loot
}
export interface Drop extends Item {
	rarity: Rarity
}
export interface Enemy {
	name: string
	health: number
	scale: number
	boss: boolean
	drops: Drop[]
	animator: ComponentsOfType<Animator<any>>
}
const enemyNames = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Porin_A', 'Forest_Butterfly_A', 'Racco_A', 'Platopo_A'] as const satisfies readonly characters[]
export type enemy = (typeof enemyNames)[number]
export const enemyData: Record<enemy, Enemy> = {
	Armabee: {
		name: 'Armabee',
		health: 3,
		scale: 4,
		boss: false,
		drops: [{ name: 'honey', quantity: 1, rarity: Rarity.Common }],

		animator: 'beeAnimator',
	},
	Armabee_Evolved: {
		name: 'Armabee Evolved',
		health: 5,
		scale: 10,
		boss: true,
		drops: [],
		animator: 'beeBossAnimator',

	},
	Shaga_A: {
		name: 'Shaga',
		health: 4,
		scale: 2,
		boss: false,
		drops: [{ name: 'parsley', quantity: 2, rarity: Rarity.Common }],
		animator: 'shagaAnimator',
	},
	Big_Boar_A: {
		name: 'Flower Boar',
		health: 3,
		scale: 1.5,
		boss: false,
		drops: [{ name: 'ham', quantity: 1, rarity: Rarity.Common }],
		animator: 'shagaAnimator',
	},
	Snailo_A: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		boss: false,
		drops: [],
		animator: 'shagaAnimator',
	},
	Porin_A: {
		name: 'Porin',
		health: 4,
		scale: 2,
		boss: false,
		drops: [{ name: 'slime_dough', quantity: 1, rarity: Rarity.Common }],
		animator: 'shagaAnimator',
	},
	Racco_A: {
		name: 'Racco',
		health: 3,
		scale: 2,
		boss: false,
		drops: [],
		animator: 'shagaAnimator',
	},
	Forest_Butterfly_A: {
		name: 'Butterfly',
		health: 3,
		scale: 2,
		boss: false,
		drops: [],
		animator: 'shagaAnimator',
	},
	Platopo_A: {
		name: 'Platopo',
		health: 3,
		scale: 10,
		boss: false,
		drops: [{ name: 'milk', quantity: 1, rarity: Rarity.Common }],
		animator: 'shagaAnimator',
	},

}

interface EnemyGroup {
	enemies: enemy[]
	boss?: enemy
}
export const enemyGroups: EnemyGroup[] = [
	{
		enemies: ['Armabee', 'Armabee', 'Armabee'],
	},
	{
		enemies: [],
		boss: 'Armabee_Evolved',
	},
	{
		enemies: ['Shaga_A', 'Shaga_A', 'Shaga_A'],
	},
	{
		enemies: ['Big_Boar_A', 'Big_Boar_A', 'Big_Boar_A'],
	},
	{
		enemies: ['Porin_A', 'Porin_A', 'Porin_A'],
	},
	{
		enemies: ['Snailo_A', 'Snailo_A', 'Snailo_A'],
	},
	{
		enemies: ['Platopo_A', 'Racco_A', 'Platopo_A'],
	},
	{
		enemies: ['Forest_Butterfly_A', 'Forest_Butterfly_A', 'Porin_A'],
	},
]