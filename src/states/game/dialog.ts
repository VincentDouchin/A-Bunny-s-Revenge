import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { dialogs } from '@/constants/dialogs'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'

export const dialogBundle = (key: keyof typeof dialogs) => {
	return {
		dialog: dialogs[key](),
		currentDialog: '',
	} as const satisfies Entity
}
const dialogQuery = ecs.with('dialog', 'position', 'size')
const playerQuery = ecs.with('position', 'playerControls')
export const talkToNPC = () => {
	for (const player of playerQuery) {
		for (const npc of dialogQuery) {
			if (player.playerControls.get('interact').justPressed) {
				if (player.position.distanceTo(npc.position) < 10) {
					const nextDialog = npc.dialog.next()
					if (nextDialog.done || !nextDialog.value) {
						ecs.removeComponent(npc, 'currentDialog')
						ecs.removeComponent(npc, 'dialogContainer')
					} else if (nextDialog.value) {
						ecs.update(npc, { currentDialog: nextDialog.value })
						if (!npc.dialogContainer) {
							const cssObj = new CSS2DObject(document.createElement('div'))
							cssObj.position.y = 4
							ecs.addComponent(npc, 'dialogContainer', cssObj)
						}
					}
				}
			}
		}
	}
}