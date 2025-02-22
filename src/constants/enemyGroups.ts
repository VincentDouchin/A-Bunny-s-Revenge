import type { Entity } from '@/global/entity'
import { Armabee, ArmabeeEvolved, Batty, Butterfly, Devil, FlowerBoar, Magicbook, Platopo, PoisonSnail, Raccoon, ShagaA, Slime, Snail } from './enemies'

export type EnemyGroup = Array<(level: number) => Entity>
export const enemyGroups: Record<number, {
	enemies: EnemyGroup[]
	bosses: EnemyGroup[]
}> = {
	0: {
		enemies: [
			[Armabee, Armabee, Armabee, FlowerBoar, FlowerBoar],
			[ShagaA, ShagaA, Slime, Slime],
			[Platopo, Raccoon, Raccoon, Snail],
			[PoisonSnail, Butterfly, Butterfly, Butterfly],

		],
		bosses: [
			[ArmabeeEvolved],
		],
	},
	1: {
		enemies: [
			[Batty, Magicbook, Devil],
		],
		bosses: [
			// [BroodMother],
		],
	},
}