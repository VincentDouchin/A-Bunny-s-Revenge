import { Easing, Tween } from '@tweenjs/tween.js'
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { dialogs } from '@/constants/dialogs'
import { type Entity, Interactable } from '@/global/entity'
import { ecs, gameTweens, time } from '@/global/init'
import { addTag } from '@/lib/hierarchy'
import { hasQuest, questsUnlocks } from '@/utils/dialogHelpers'

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
export const addQuestMarkers = () => questMarkerQuery.onEntityAdded.subscribe((e) => {
	if (!hasQuest(e.questMarker) && questsUnlocks[e.questMarker]()) {
		const questMarkerContainer = new Group()
		const mat = new MeshBasicMaterial({ color: 0xFFFF33, depthWrite: false })
		const dot = new Mesh(new SphereGeometry(0.5), mat)
		const line = new Mesh(new CylinderGeometry(0.5, 0.5, 4), mat)
		line.position.setY(3)
		questMarkerContainer.add(dot)
		questMarkerContainer.add(line)
		questMarkerContainer.position.setY(15)
		questMarkerContainer.renderOrder = 100
		gameTweens.add(new Tween(line.scale).to(new Vector3(2, 0.5, 2), 500)
			.onUpdate(scale => line.position.setY(3 + (4 * scale.y) / 2))
			.yoyo(true)
			.delay(1000)
			.easing(Easing.Elastic.Out)
			.repeat(Number.POSITIVE_INFINITY),
		)
		ecs.update(e, { questMarkerContainer })
	}
})