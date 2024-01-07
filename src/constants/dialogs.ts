import type { Dialog } from '@/global/entity'
import { cutSceneState } from '@/global/states'
import { addQuest, canCompleteQuest, completeQuest, enterHouse, hasCompletedQuest, hasQuest, leaveHouse, pandaQuery } from '@/utils/dialogHelpers'

export const dialogs = {
	*Panda() {
		while (true) {
			pandaQuery.first?.animator.playOnce('Wave')
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
			if (hasQuest('grandma_1')) {
				if (canCompleteQuest('grandma_1')) {
					yield 'Oh you brought me the roasted carrots I asked for!'
					yield 'You\'re such a lovely grandson'
					completeQuest('grandma_1')
				} else {
					yield 'Are you having trouble roasting the carrots?'
				}
			} else if (!hasCompletedQuest('grandma_1')) {
				yield 'Could you bring me some roasted carrots?'
				addQuest('grandma_1')
			} else {
				yield 'Thanks again for these delicious roasted carrots'
			}
			leaveHouse()
			yield false
		}
	},
} as const satisfies Partial<Record<string, () => Dialog>>