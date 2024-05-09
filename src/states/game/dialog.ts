import { dialogs } from '@/constants/dialogs'
import { type Entity, Interactable } from '@/global/entity'
import { ecs } from '@/global/init'
import { addTag } from '@/lib/hierarchy'

export const dialogBundle = (key: keyof typeof dialogs) => {
	return {
		dialog: dialogs[key](),
		interactable: Interactable.Talk,
	} as const satisfies Entity
}
const dialogQuery = ecs.with('dialog', 'interactionContainer')
const playerQuery = ecs.with('player', 'playerControls', 'position', 'rotation')
export const talkToNPC = () => {
	for (const player of playerQuery) {
		for (const npc of dialogQuery) {
			if (player.playerControls.get('primary').justPressed) {
				addTag(npc, 'activeDialog')
			}
		}
	}
}

const npcQuery = ecs.with('npc', 'model', 'position', 'rotation')
export const turnNPCHead = () => {
	for (const player of playerQuery) {
		for (const npc of npcQuery) {
			if (npc.position.distanceTo(player.position) < 100) {
				const headBone = npc.model.getObjectByName('head')
				if (headBone) {

					// // const angle = npc.position.clone()
					// const force = npc.position.clone().sub(player.position)
					// const face = new Euler().setFromQuaternion(npc.rotation, 'XYZ')

					// const angle = Math.atan2(force.x, force.z)
					// // const angleClamped = clamp(angle, -Math.PI / 2, Math.PI / 2)
					// headBone.setRotationFromAxisAngle(new Vector3(0, 1, 0), angle)
				}
			}
		}
	}
}
