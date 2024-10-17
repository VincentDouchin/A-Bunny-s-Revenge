import type { Dialog, Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs, time } from '@/global/init'
import { Quaternion, Vector3 } from 'three'

export const dialogBundle = (dialog: Dialog) => {
	return {
		dialog,
		interactable: Interactable.Talk,
	} as const satisfies Entity
}
const playerQuery = ecs.with('player', 'playerControls', 'position', 'rotation')

const npcQuery = ecs.with('npc', 'model', 'position', 'rotation', 'group')
export const turnNPCHead = () => {
	for (const player of playerQuery) {
		for (const npc of npcQuery) {
			if (npc.position.distanceTo(player.position) < 100) {
				const headBone = npc.model.getObjectByName('head')
				if (headBone) {
					const playerRelativePosition = npc.group.worldToLocal(player.position.clone())
					const dist = player.position.distanceTo(npc.position)
					const targetQuaternion = new Quaternion()
					if (playerRelativePosition.z > 0 && dist < 20) {
						const angle = Math.atan2(playerRelativePosition.x, playerRelativePosition.z)
						targetQuaternion.setFromAxisAngle(new Vector3(0, 1, 0), angle)
					} else {
						targetQuaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0)
					}
					headBone.quaternion.slerp(targetQuaternion, time.delta * 4 / 1000)
				}
			}
		}
	}
}