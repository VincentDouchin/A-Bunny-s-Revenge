import type { characters } from '@assets/assets'
import type { Item } from './items'
import { Rarity } from './items'

import { EnemyAttackStyle } from '@/global/entity'
import type { EnemyAnimations } from '@/global/entity'
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
export interface Enemy<Name extends keyof Animations> {
	name: string
	health: number
	scale: number
	speed: number
	boss: boolean
	attackStyle: EnemyAttackStyle
	drops: Drop[]
	animationMap: Map<Animations[Name], EnemyAnimations>
}
const enemyNames = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Porin_A', 'Forest_Butterfly_A', 'Racco_A', 'Platopo_A'] as const satisfies readonly characters[]

export type enemy = (typeof enemyNames)[number]

const genericEnemyAnimationMap = new Map<Animations['Big_Boar_A'], EnemyAnimations>().set('Attack', 'attacking').set('Damage', 'hit').set('Die', 'dead').set('Idle', 'idle').set('Move', 'running')

export const enemyData: { [k in enemy]: Enemy<k> } = {
	Armabee: {
		name: 'Armabee',
		health: 3,
		scale: 4,
		speed: 1,
		boss: false,
		attackStyle: EnemyAttackStyle.Melee,
		drops: [{ name: 'honey', quantity: 1, rarity: Rarity.Common }],
		animationMap: new Map<Animations['Armabee'], EnemyAnimations>().set('Death', 'dead').set('Flying_Idle', 'idle').set('Headbutt', 'attacking').set('HitReact', 'hit').set('Fast_Flying', 'running'),
	},
	Armabee_Evolved: {
		name: 'Armabee Evolved',
		health: 5,
		scale: 10,
		speed: 1,
		boss: true,
		drops: [],
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: new Map<Animations['Armabee_Evolved'], EnemyAnimations>().set('Death', 'dead').set('Flying_Idle', 'idle').set('Headbutt', 'attacking').set('HitReact', 'hit'),

	},
	Shaga_A: {
		name: 'Shaga',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		attackStyle: EnemyAttackStyle.Melee,
		drops: [{ name: 'parsley', quantity: 2, rarity: Rarity.Common }],
		animationMap: genericEnemyAnimationMap,
	},
	Big_Boar_A: {
		name: 'Flower Boar',
		health: 3,
		scale: 1.5,
		speed: 1,
		boss: false,
		attackStyle: EnemyAttackStyle.Charging,
		drops: [{ name: 'ham', quantity: 1, rarity: Rarity.Common }],
		animationMap: genericEnemyAnimationMap,
	},
	Snailo_A: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		speed: 1,
		boss: false,
		drops: [],
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
	},
	Porin_A: {
		name: 'Porin',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		attackStyle: EnemyAttackStyle.Melee,
		drops: [{ name: 'slime_dough', quantity: 1, rarity: Rarity.Common }],
		animationMap: genericEnemyAnimationMap,
	},
	Racco_A: {
		name: 'Racco',
		health: 3,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [],
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Forest_Butterfly_A: {
		name: 'Butterfly',
		health: 3,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [],
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Platopo_A: {
		name: 'Platopo',
		health: 3,
		scale: 10,
		speed: 0.7,
		boss: false,
		attackStyle: EnemyAttackStyle.Range,
		drops: [{ name: 'milk', quantity: 1, rarity: Rarity.Common }],
		animationMap: genericEnemyAnimationMap,
	},
}

export interface EnemyGroup {
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