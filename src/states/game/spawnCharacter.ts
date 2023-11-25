import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Box3, Quaternion, Vector3 } from 'three'
import { Animator } from '@/global/animator'
import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/lib/inputs'
import type { playerAnimations } from '@/constants/animations'

export const spawnCharacter = () => {
	const model = assets.characters.BunnyMain
	const size = new Vector3()
	new Box3().setFromObject(model.scene).getSize(size)
	size.divideScalar(2)
	ecs.add({
		model: model.scene,
		position: new Vector3(0, 0, 0),
		playerControls: playerInputMap(),
		bodyDesc: RigidBodyDesc.dynamic().setCcdEnabled(true).lockRotations().setLinearDamping(5),
		colliderDesc: ColliderDesc.cuboid(size.x, size.y, size.z).setTranslation(0, size.y, 0),
		playerAnimator: new Animator<playerAnimations>('idle', model),
		rotation: new Quaternion(),
		cameratarget: true,
	})
}