import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { LinearSRGBColorSpace, Mesh, NearestFilter, Quaternion, Vector3 } from 'three'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { menuInputMap, playerInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import type { FarmRessources } from '@/global/states'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'

export const playerBundle = () => {
	const model = assets.characters.Running
	model.scene.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
			node.material.map.minFilter = NearestFilter
			node.material.map.magFilter = NearestFilter
		}
	})
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
		animator: new Animator('idle', bundle.model, [...run, ...idle]),
		inMap: true,
		cameratarget: true,
		faction: Faction.Player,
		sensor: true,
		player: true,
		movementForce: new Vector3(),
		speed: 300,
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
