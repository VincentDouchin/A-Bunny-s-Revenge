import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Interactable } from '@/global/entity'
import { assets } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { stateBundle } from '@/lib/stateMachine'

export const NPCBundle = (character: 'Panda') => {
	const model = assets.characters[character]
	model.scene.scale.setScalar(4)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Fixed, false, Sizes.character)

	return {
		...bundle,
		pandaAnimator: new Animator(bundle.model, model.animations),
		inMap: true,
		npc: true,
		npcName: 'Panda',
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
		interactable: Interactable.Talk,
		...stateBundle<'idle' | 'hello'>('idle', { idle: ['hello'], hello: ['idle'] }),

	} as const satisfies Entity
}