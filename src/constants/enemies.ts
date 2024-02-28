import type { characters } from '@assets/assets'
import { between } from 'randomish'
import { type Item, itemsData } from './items'
import type { Animator } from '@/global/animator'
import type { ComponentsOfType } from '@/global/entity'
import { entries, getRandom, range } from '@/utils/mapFunctions'

export interface Enemy {
	health: number
	scale: number
	drops: () => Item[]
	animator: ComponentsOfType<Animator<any>>
}
const enemyNames = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Porin_A', 'Forest_Butterfly_A', 'Racco_A', 'Platopo_A'] as const satisfies readonly characters[]
export type enemy = (typeof enemyNames)[number]
export const enemyData: Record<enemy, Enemy> = {
	Armabee: {
		health: 3,
		scale: 4,
		drops: () => {
			const quantity = Math.random() < 0.5 ? 1 : 0
			return [{ name: 'honey', quantity }]
		},
		animator: 'beeAnimator',
	},
	Armabee_Evolved: {
		health: 5,
		scale: 5,
		drops: () => {
			const seeds = entries(itemsData).filter(([_, data]) => data.seed).map(([name]) => name)
			return range(1, between(3, 5), () => ({ name: getRandom(seeds), quantity: 1 }))
		},
		animator: 'beeAnimator',

	},
	Shaga_A: {
		health: 4,
		scale: 2,
		drops: () => [{ name: 'parsley', quantity: 2 }],
		animator: 'shagaAnimator',
	},
	Big_Boar_A: {
		health: 3,
		scale: 1.5,
		drops: () => [{ name: 'ham', quantity: 1 }],
		animator: 'shagaAnimator',
	},
	Snailo_A: {
		health: 3,
		scale: 1.4,
		drops: () => [],
		animator: 'shagaAnimator',
	},
	Porin_A: {
		health: 4,
		scale: 2,
		drops: () => [{ name: 'slime_dough', quantity: 1 }],
		animator: 'shagaAnimator',
	},
	Racco_A: {
		health: 3,
		scale: 2,
		drops: () => [],
		animator: 'shagaAnimator',
	},
	Forest_Butterfly_A: {
		health: 3,
		scale: 2,
		drops: () => [],
		animator: 'shagaAnimator',
	},
	Platopo_A: {
		health: 3,
		scale: 10,
		drops: () => Math.random() > 0.5 ? [{ name: 'milk', quantity: 1 }] : [],
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
		enemies: ['Armabee', 'Armabee'],
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