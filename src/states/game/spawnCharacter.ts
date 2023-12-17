import { Vector3 } from 'three'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap, playerInputMap } from '@/lib/inputs'
import { modelColliderBundle } from '@/lib/models'

export const playerBundle = () => {
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
