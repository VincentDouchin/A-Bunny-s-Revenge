import type { enemy } from './enemies'

export interface EnemyGroup {
	enemies: enemy[]
	boss?: enemy
}
export const enemyGroups: Record<number, EnemyGroup[]> = {
	0: [
		{ enemies: ['Armabee', 'Armabee', 'Armabee', 'Big_Boar_A', 'Big_Boar_A'] },
		{ enemies: ['Shaga_A', 'Shaga_A', 'Porin_A', 'Porin_A'] },
		{ enemies: ['Platopo_A', 'Racco_A', 'Racco_A', 'Snailo_A'] },
		{ enemies: ['Forest_Butterfly_A', 'Snailo_B', 'Forest_Butterfly_A', 'Forest_Butterfly_A'] },
		{ enemies: [], boss: 'Armabee_Evolved' },
	],
	1: [
		{ enemies: ['Batty_A', 'Magicbook_A', 'Devilu_A'] },
		{ enemies: [], boss: 'Big_Boar_C' },
	],
}