import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { dialogs } from '@/constants/dialogs'
import { Sizes } from '@/constants/sizes'
import { Interactable } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'

export const encounters = {
	jack: () => {
		const model = assets.characters['Frog Man']
		model.scene.scale.setScalar(4)
		const bundle = modelColliderBundle(model.scene, RigidBodyType.Fixed, false, Sizes.character)

		ecs.add({
			...bundle,
			inMap: true,
			npc: true,
			dialog: dialogs.Jack(),
			position: new Vector3(),
			rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
			interactable: Interactable.Talk,

		})
	},
} as const