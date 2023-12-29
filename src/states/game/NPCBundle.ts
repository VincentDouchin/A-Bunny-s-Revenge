import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'

export const NPCBundle = (character: characters) => {
	const model = assets.characters[character]
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Fixed, false)
	return {
		...bundle,
		inMap: true,
		npc: true,
		npcName: 'Panda',
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
	} as const satisfies Entity
}