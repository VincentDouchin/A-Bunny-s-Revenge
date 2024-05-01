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
const playerQuery = ecs.with('player', 'playerControls')
export const talkToNPC = () => {
	for (const player of playerQuery) {
		if (player.playerControls.get('primary').justPressed) {
			for (const npc of dialogQuery) {
				addTag(npc, 'activeDialog')
			}
		}
	}
}