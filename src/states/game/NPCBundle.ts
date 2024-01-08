import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'

export const NPCBundle = (character: 'Panda') => {
	const model = assets.characters[character]
	model.scene.scale.setScalar(4)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Fixed, false, Sizes.character)

	return {
		...bundle,
		animator: new Animator('Idle', bundle.model, model.animations),
		inMap: true,
		npc: true,
		npcName: 'Panda',
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
		interactable: 'talk',

	} as const satisfies Entity
}