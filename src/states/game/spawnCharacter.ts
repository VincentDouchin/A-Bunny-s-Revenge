import { Vector3 } from 'three'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { menuInputMap, playerInputMap } from '@/lib/inputs'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'

const playerBundle = () => {
	const model = assets.characters.BunnyMain
	const bundle = modelColliderBundle(model.scene)
	bundle.bodyDesc.setLinearDamping(15)
	return {
		...playerInputMap(),
		...menuInputMap(),
		...bundle,

		inMap: true,
		cameratarget: true,
		playerAnimator: new Animator('idle', model),
		faction: Faction.Player,
		sensor: true,
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