import type { Dialog } from '@/global/entity'
import { cutSceneState } from '@/global/states'
import { soundDialog } from '@/lib/dialogSound'
import { addItemToPlayer, addQuest, canCompleteQuest, completeQuest, enterHouse, hasCompletedQuest, hasQuest, leaveHouse, pandaQuery } from '@/utils/dialogHelpers'

export const dialogs = {
	*Panda() {
		while (true) {
			const panda = pandaQuery.first
			if (panda) {
				panda.stateMachine.enter('hello', panda)
			}
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
			soundDialog('Hello dear')
			yield 'Hello dear'
			soundDialog('How are you doing')
			yield 'How are you doing?'
			addItemToPlayer({ name: 'carrot_seeds', quantity: 10 })
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
				soundDialog('Thanks again for these delicious roasted carrots')
				yield 'Thanks again for these delicious roasted carrots'
			}
			leaveHouse()
			yield false
		}
	},
} as const satisfies Partial<Record<string, () => Dialog>>