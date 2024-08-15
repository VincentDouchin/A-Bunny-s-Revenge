import { circIn } from 'popmotion'
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { dialogs } from '@/constants/dialogs'
import type { Dialog, Entity, QueryEntity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs, time, tweens } from '@/global/init'
import { showMarker } from '@/utils/dialogHelpers'

export const dialogBundle = (dialog: Dialog) => {
	return {
		dialog,
		interactable: Interactable.Talk,
	} as const satisfies Entity
}
// const dialogQuery = ecs.with('dialog', 'interactionContainer')
const playerQuery = ecs.with('player', 'playerControls', 'position', 'rotation')
// export const talkToNPC = () => {
// 	for (const player of playerQuery) {
// 		for (const npc of dialogQuery) {
// 			if (player.playerControls.get('primary').justPressed) {
// 				// ecs.addComponent(npc, 'activeDialog', true)
// 			}
// 		}
// 	}
// }

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

const questMarkerQuery = ecs.with('questMarker')
export const displayQuestMarker = (e: QueryEntity<typeof questMarkerQuery>) => {
	if (e.questMarker.some(showMarker)) {
		const questMarkerContainer = new Group()
		const mat = new MeshBasicMaterial({ color: 0xFFFF33, depthWrite: false })
		const dot = new Mesh(new SphereGeometry(0.5), mat)
		const line = new Mesh(new CylinderGeometry(0.5, 0.5, 4), mat)
		line.position.setY(3)

		if (e.rotation) {
			questMarkerContainer.rotation.setFromQuaternion(e.rotation.clone().invert())
		}
		questMarkerContainer.add(dot)
		questMarkerContainer.add(line)
		if (e.questMarkerPosition) {
			questMarkerContainer.position.copy(e.questMarkerPosition.clone())
		} else {
			questMarkerContainer.position.setY(15)
		}
		questMarkerContainer.renderOrder = 100
		tweens.add({
			from: line.scale.clone(),
			to: new Vector3(2, 0.5, 2),
			duration: 500,
			parent: e,
			ease: circIn,
			repeat: Number.POSITIVE_INFINITY,
			repeatType: 'mirror',
			onUpdate: (f) => {
				line.scale.copy(f)
				line.position.setY(3 + (4 * f.y) / 2)
			},
		})
		ecs.update(e, { questMarkerContainer })
	}
}
export const addQuestMarkers = () => questMarkerQuery.onEntityAdded.subscribe(displayQuestMarker)

const dialogTriggerQuery = ecs.with('position', 'dialogTrigger')
export const triggerDialog = () => {
	for (const player of playerQuery) {
		for (const marker of dialogTriggerQuery) {
			if (marker.position.distanceTo(player.position) < 10) {
				const dialog = {
					pickupBasket: dialogs.pickupBasket,
				}[marker.dialogTrigger]
				if (dialog) {
					player.targetMovementForce?.setScalar(0)
					player.movementForce?.setScalar(0)
					ecs.add({
						dialog: dialog(),
					})
					ecs.remove(marker)
				}
			}
		}
	}
}
