import type { characters, items } from '@assets/assets'
import type { Animator } from '@/global/animator'
import type { ComponentsOfType } from '@/global/entity'

export interface Drop {
	item: items
	quantity: () => number
}
export interface Enemy {
	health: number
	scale: number
	drops: Drop[]
	animator: ComponentsOfType<Animator<any>>
}
const enemyNames = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Porin_A'] as const satisfies readonly characters[]
export type enemy = (typeof enemyNames)[number]
export const enemyData: Record<enemy, Enemy> = {
	Armabee: {
		health: 3,
		scale: 4,
		drops: [{ item: 'honey', quantity: () => Math.random() < 0.5 ? 1 : 0 }],
		animator: 'beeAnimator',
	},
	Armabee_Evolved: {
		health: 5,
		scale: 5,
		drops: [{
			item: 'carrot_seeds',
			quantity: () => 2,
		}, {
			item: 'lettuce_seeds',
			quantity: () => 2,
		}],
		animator: 'beeAnimator',

	},
	Shaga_A: {
		health: 4,
		scale: 2,
		drops: [{ item: 'parsley', quantity: () => 2 }],
		animator: 'shagaAnimator',
	},
	Big_Boar_A: {
		health: 3,
		scale: 1.5,
		drops: [],
		animator: 'shagaAnimator',
	},
	Snailo_A: {
		health: 3,
		scale: 1.4,
		drops: [],
		animator: 'shagaAnimator',
	},
	Porin_A: {
		health: 4,
		scale: 2,
		drops: [],
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
]