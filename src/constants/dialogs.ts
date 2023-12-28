import type { Dialog } from '@/global/entity'
import { cutSceneState } from '@/global/states'
import { enterHouse, leaveHouse } from '@/utils/dialogHelpers'

export const dialogs = {
	*Panda() {
		while (true) {
			yield 'hello'
			yield 'What a beautiful day we\'re having!'
			yield false
		}
	},
	*GrandmasDoor() {
		while (true) {
			cutSceneState.enable()
			enterHouse()
			yield false
		}
	},
	*GrandmasHouse() {
		while (true) {
			yield 'Hello dear'
			yield 'How are you doing?'
			leaveHouse()
			yield false
		}
	},
} as const satisfies Partial<Record<string, () => Dialog>>