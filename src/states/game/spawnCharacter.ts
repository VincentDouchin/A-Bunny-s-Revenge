import { Box3, Vector3 } from 'three'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { playerInputMap } from '@/lib/inputs'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { type Entity, Faction } from '@/global/entity'
import { Animator } from '@/global/animator'

const playerBundle = () => {
	const model = assets.characters.BunnyMain
	const size = new Vector3()
	new Box3().setFromObject(model.scene).getSize(size)
	size.divideScalar(2)
	return {
		inMap: true,
		playerControls: playerInputMap(),
		cameratarget: true,
		...modelColliderBundle(model.scene),
		playerAnimator: new Animator('idle', model),
		faction: Faction.Player,
	} as const satisfies Entity
}

export const spawnCharacter = () => {
	ecs.add({
		...playerBundle(),
		position: new Vector3(0, 0, 0),
	})
}
const doorQuery = ecs.with('door', 'position')
export const spawnCharacterDungeon: System<DungeonRessources> = ({ direction }) => {
	for (const { door, position } of doorQuery) {
		if (door.direction === direction) {
			ecs.add({
				...playerBundle(),
				position: position.clone(),
			})
		}
	}
}