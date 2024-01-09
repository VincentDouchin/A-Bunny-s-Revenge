import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { dialogs } from '@/constants/dialogs'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import { addTag } from '@/lib/hierarchy'

export const dialogBundle = (key: keyof typeof dialogs) => {
	return {
		dialog: dialogs[key](),
		currentDialog: '',
	} as const satisfies Entity
}
const dialogQuery = ecs.with('dialog', 'worldPosition')
const playerQuery = ecs.with('worldPosition', 'playerControls')
const activeDialogQuery = dialogQuery.with('activeDialog')
export const talkToNPC = () => {
	for (const player of playerQuery) {
		if (player.playerControls.get('interact').justPressed) {
			for (const npc of dialogQuery) {
				if (player.worldPosition.distanceTo(npc.worldPosition) < 10) {
					addTag(npc, 'activeDialog')
				}
			}
			for (const npc of activeDialogQuery) {
				const nextDialog = npc.dialog.next()
				if (nextDialog.value === false) {
					ecs.removeComponent(npc, 'activeDialog')
				}
				if (nextDialog.done || !nextDialog.value) {
					ecs.removeComponent(npc, 'currentDialog')
					ecs.removeComponent(npc, 'dialogContainer')
				} else if (nextDialog.value) {
					ecs.update(npc, { currentDialog: nextDialog.value })
					if (!npc.dialogContainer) {
						const cssObj = new CSS2DObject(document.createElement('div'))
						cssObj.position.y = npc.size?.y ?? 4
						ecs.addComponent(npc, 'dialogContainer', cssObj)
					}
				}
			}
		}
	}
}