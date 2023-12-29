import { Quaternion, Vector3 } from 'three'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap, playerInputMap } from '@/lib/inputs'
import { modelColliderBundle } from '@/lib/models'
import { Sizes } from '@/constants/sizes'
import type { System } from '@/lib/state'
import type { FarmRessources } from '@/global/states'
import { save } from '@/global/save'

export const playerBundle = () => {
	const model = assets.characters.Running
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, Sizes.character)
	const idle = assets.characters.Idle.animations
	idle.forEach(x => x.name = 'idle')
	const run = assets.characters.Running.animations
	run.forEach(x => x.name = 'run')
	bundle.bodyDesc.setLinearDamping(20)
	return {
		...playerInputMap(),
		...menuInputMap(),
		...bundle,
		inMap: true,
		cameratarget: true,
		playerAnimator: new Animator('idle', bundle.model, [...idle, ...run]),
		faction: Faction.Player,
		sensor: true,
		player: true,
		movementForce: new Vector3(),
	} as const satisfies Entity
}

export const spawnCharacter: System<FarmRessources> = ({ previousState }) => {
	const [position, rotation] = previousState === 'dungeon'
		? [new Vector3(), new Quaternion()]
		: [new Vector3().fromArray(save.playerPosition), new Quaternion().fromArray(save.playerRotation)]

	ecs.add({
		...playerBundle(),
		position,
		rotation,
	})
}
