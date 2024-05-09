import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { dialogs } from '@/constants/dialogs'
import { Sizes } from '@/constants/sizes'
import { Interactable } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { inMap } from '@/lib/hierarchy'
import { Animator } from '@/global/animator'
import { hasCompletedQuest } from '@/utils/dialogHelpers'

export const encounters = {
	jack: () => {
		const model = assets.characters.JACK_animated
		const bundle = modelColliderBundle(model.scene, RigidBodyType.Fixed, false, Sizes.character)
		bundle.model.scale.setScalar(6)
		const jack = ecs.add({
			...bundle,
			...inMap(),
			npcName: 'Jack',
			npc: true,
			dialog: dialogs.Jack(),
			kayAnimator: new Animator(bundle.model, model.animations),
			position: new Vector3(20, 0, 0),
			rotation: new Quaternion(),
			interactable: Interactable.Talk,
			targetRotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 3),

		})
		jack.kayAnimator.playAnimation('Idle')
	},
	alice: () => {
		const aliceModel = assets.characters.ALICE_animated
		const model = clone(aliceModel.scene)
		if (!hasCompletedQuest('alice_1')) {
			const mushroomModel = assets.models.Shroom1.scene.clone()
			mushroomModel.scale.multiplyScalar(20)
			const mushroom = ecs.add({
				model: mushroomModel,
				position: new Vector3(-40, 0, 0),
				...inMap(),
				rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2 * 1.5),
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cylinder(5, 10),
			})

			model.scale.multiplyScalar(4)

			const alice = ecs.add({
				model,
				position: new Vector3(-9, 15, 0),
				rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
				kayAnimator: new Animator(model, aliceModel.animations),
				parent: mushroom,
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cylinder(30, 2),
				npcName: 'Alice',
				dialog: dialogs.Alice(),
				interactable: Interactable.Talk,
			})
			alice.kayAnimator.playAnimation('Sit_Chair_Idle')
		} else {
			model.scale.multiplyScalar(32)
			const alice = ecs.add({
				model,
				position: new Vector3(0, 0, 0),
				rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
				kayAnimator: new Animator(model, aliceModel.animations),
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cylinder(30, 8).setTranslation(0, 15, 0),
				npcName: 'Alice',
				dialog: dialogs.AliceBigAfter(),
				interactable: Interactable.Talk,
				...inMap(),
			})
			alice.kayAnimator.playAnimation('Idle')
		}
	},
} as const