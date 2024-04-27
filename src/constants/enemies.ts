import type { characters } from '@assets/assets'
import type { Item } from './items'
import { Rarity } from './items'

import type { EnemyAnimations, Entity, States } from '@/global/entity'
import { EnemyAttackStyle } from '@/global/entity'
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
	behavior: keyof States
	attackStyle: EnemyAttackStyle
	drops: Drop[]
	animationMap: Record<EnemyAnimations, Animations[Name]>
	components?: () => Entity
}
const enemyNames = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Snailo_B', 'Porin_A', 'Forest_Butterfly_A', 'Racco_A', 'Platopo_A'] as const satisfies readonly characters[]

export type enemy = (typeof enemyNames)[number]

const genericEnemyAnimationMap: Record<EnemyAnimations, Animations['Big_Boar_A']> = {
	idle: 'Idle',
	running: 'Move',
	attacking: 'Attack',
	hit: 'Damage',
	dead: 'Die',
}

export const enemyData: { [k in enemy]: Enemy<k> } = {
	Armabee: {
		name: 'Armabee',
		health: 3,
		scale: 4,
		speed: 1,
		boss: false,
		drops: [{ name: 'honey', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: {
			idle: 'Flying_Idle',
			running: 'Fast_Flying',
			attacking: 'Headbutt',
			hit: 'HitReact',
			dead: 'Death',
		},
	},
	Armabee_Evolved: {
		name: 'Armabee Evolved',
		health: 30,
		scale: 10,
		speed: 1,
		boss: true,
		drops: [],
		behavior: 'boss',
		attackStyle: EnemyAttackStyle.BeeBoss,
		animationMap: {
			idle: 'Flying_Idle',
			running: 'Fast_Flying',
			attacking: 'Headbutt',
			hit: 'HitReact',
			dead: 'Death',
		},

	},
	Shaga_A: {
		name: 'Shaga',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [{ name: 'parsley', quantity: 2, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Big_Boar_A: {
		name: 'Flower Boar',
		health: 3,
		scale: 1.5,
		speed: 1,
		boss: false,
		drops: [{ name: 'ham', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
	},
	Snailo_A: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		speed: 1,
		boss: false,
		drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
	},
	Snailo_B: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		speed: 1,
		boss: false,
		drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
		components: () => ({
			trailMaker: true,
		}),
	},
	Porin_A: {
		name: 'Porin',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [{ name: 'slime_dough', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Jumping,
		animationMap: genericEnemyAnimationMap,
	},
	Racco_A: {
		name: 'Racco',
		health: 3,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
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
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Platopo_A: {
		name: 'Platopo',
		health: 3,
		scale: 10,
		speed: 0.7,
		boss: false,
		drops: [{ name: 'milk', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Range,
		animationMap: genericEnemyAnimationMap,
	},
}

export interface EnemyGroup {
	enemies: enemy[]
	boss?: enemy
}
export const enemyGroups: EnemyGroup[] = [
	{
		enemies: ['Armabee', 'Armabee', 'Armabee', 'Armabee', 'Armabee'],
	},
	{
		enemies: [],
		boss: 'Armabee_Evolved',
	},
	{
		enemies: ['Shaga_A', 'Shaga_A', 'Snailo_A'],
	},
	{
		enemies: ['Shaga_A', 'Shaga_A', 'Porin_A', 'Porin_A'],
	},
	{
		enemies: ['Snailo_A', 'Racco_A', 'Racco_A'],
	},
	{
		enemies: ['Platopo_A', 'Racco_A', 'Racco_A'],
	},
	{
		enemies: ['Forest_Butterfly_A', 'Snailo_B', 'Forest_Butterfly_A', 'Forest_Butterfly_A'],
	},
]