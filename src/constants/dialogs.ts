import type { Dialog } from '@/global/entity'
import { cutSceneState } from '@/global/states'
import { soundDialog } from '@/lib/dialogSound'
import { addItemToPlayer, addQuest, canCompleteQuest, completeQuest, enterHouse, hasCompletedQuest, hasQuest, leaveHouse, lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'

export const dialogs = {

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
	*Jack() {
		lockPlayer()

		if (hasCompletedQuest('jack_1')) {
			yield 'The soup was delicious!'
		} else {
			if (!hasQuest('jack_1')) {
				yield 'Hello! I am a placeholder for jack'
				yield 'I am so hungry but all I have is this lousy bean'
				yield 'The guy who sold it to me said it was magic'
				yield 'but so far nothing happened'
				yield 'Tell you what, bring me some food and I\'ll give you the bean.'
				yield 'Deal?'
				addQuest('jack_1')
			}
			if (canCompleteQuest('jack_1')) {
				completeQuest('jack_1')
				yield 'Oh thank you for the carrot soup!'
				yield 'I was so hungry'
				yield 'Here is the magic bean'
				yield 'Maybe you can grow something with it?'
				addItemToPlayer({ name: 'magic_bean', quantity: 1 })
			}
		}
		unlockPlayer()
	},
} as const satisfies Partial<Record<string, () => Dialog>>