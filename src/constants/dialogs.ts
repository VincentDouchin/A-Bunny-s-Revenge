import { itemsData } from './items'
import type { Dialog } from '@/global/entity'
import { cutSceneState } from '@/global/states'
import { soundDialog } from '@/lib/dialogSound'
import { dialog, t } from '@/translations'
import { addItemToPlayer, addQuest, aliceJumpDown, canCompleteQuest, completeQuest, enterHouse, hasCompletedQuest, hasEaten, hasItem, hasQuest, leaveHouse, lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'

export const dialogs = {

	async *GrandmasDoor() {
		while (true) {
			cutSceneState.enable()
			enterHouse()
			yield false
		}
	},
	*GrandmasHouse() {
		while (true) {
			soundDialog('Hello dear')
			yield t(dialog.grandma.hello)
			soundDialog('How are you doing')
			yield t(dialog.grandma.howareyoudoing)
			if (hasQuest('grandma_1') && !hasCompletedQuest('grandma_1')) {
				if (canCompleteQuest('grandma_1')) {
					yield 'Oh you brought me the roasted carrots I asked for!'
					yield 'You\'re such a lovely granddaughter'
					completeQuest('grandma_1')
				} else {
					if (!hasItem(i => Boolean(itemsData[i.name].seed))) {
						yield 'Oh you don\'t have any seeds!'
						yield 'Here, let me give you a few'
						addItemToPlayer({ name: 'carrot_seeds', quantity: 10 })
					} else {
						yield 'Are you having trouble roasting the carrots?'
					}
				}
			} else if (!hasEaten() && !hasItem('cookie')) {
				yield 'Are you hungry? Here, have a cookie'
				addItemToPlayer({ name: 'cookie', quantity: 1 })
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
		while (true) {
			lockPlayer()
			if (hasCompletedQuest('jack_1')) {
				yield 'The soup was delicious!'
			} else if (!hasQuest('jack_1')) {
				yield 'Hello!'
				yield 'I am so hungry but all I have is this lousy bean'
				yield 'The guy who sold it to me said it was magic'
				yield 'but so far nothing happened'
				yield 'Tell you what, bring me some food and I\'ll give you the bean.'
				yield 'Deal?'
				addQuest('jack_1')
			} else if (canCompleteQuest('jack_1')) {
				completeQuest('jack_1')
				yield 'Oh thank you for the carrot soup!'
				yield 'I was so hungry'
				yield 'Here is the magic bean'
				addItemToPlayer({ name: 'magic_bean', quantity: 1 })
				yield 'Maybe you can grow something with it?'
			}
			unlockPlayer()
			yield false
		}
	},
	*Seller() {
		while (true) {
			lockPlayer()
			yield 'Want to buy something?'
			yield 'Have a look at what I have available!'
			unlockPlayer()
			yield false
		}
	},
	*Alice() {
		if (!hasQuest('alice_1')) {
			yield 'Hello!'
			yield 'I seem to have drank the wrong potion and it made me tiny'
			yield 'I can\'t do anything when I\'m this size!'
			yield 'Do you know how I could get to my regular size?'
		}
		if (!hasItem('hummus')) {
			if (hasCompletedQuest('jack_1') && !hasQuest('alice_1')) {
				yield 'oh you found a magic bean?'
				yield 'maybe that could help me get to my regular size!'
				addQuest('alice_1')
				yield false
			}
			while (true) {
				yield 'have you found anything?'
				yield 'Being this tiny is actually really dangerous'
				yield 'The other day a caterpillar almost stepped on me!'
				yield false
			}
		} else {
			yield 'this looks really good!'
			yield 'let me have a taste'
			aliceJumpDown()
		}
	},
	*AliceBig() {
		yield 'Oh no, this won\'t do!'
		yield 'I\'m as big as a house!'
		yield 'do you think you could try another meal to bring me to a regular size?'
		yield false
		while (true) {
			yield 'be careful down there, I don\'t want to step on you'
			yield false
		}
	},
	*AliceBigAfter() {
		while (true) {
			yield 'Being this huge is not much better'
			yield 'I keep stomping on everything!'
			yield false
		}
	},
} as const satisfies Partial<Record<string, () => Dialog>>