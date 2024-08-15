import type { Query } from 'miniplex'
import type { Dialog, Entity } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { cutSceneState } from '@/global/states'
import { pickUpBasket } from '@/states/intro/startIntro'
import { displayKeyItem } from '@/ui/KeyItem'
import { TutorialWindow } from '@/ui/Tutorial'
import { addQuest, completeQuestStep, enterHouse, leaveHouse, sleepPlayer, speaker, unlockCellar } from '@/utils/dialogHelpers'
import { getRandom } from '@/utils/mapFunctions'

export const dialogs = {
	async *PlayerIntro1() {
		speaker('Player')
		cutSceneState.enable()
		await sleepPlayer()
		yield 'Huh?'
		yield 'Where am I?'
		yield '...'
		yield 'Oh that\'s right'
		yield 'Grandma sent me into the Woods to get some ingredients for the Cooking Festival.'
		yield 'I laid down for a moment to rest and I guess I fell asleep'
		yield 'I should try to find my way back…'
		ecs.add({ tutorial: TutorialWindow.Movement })
		addQuest('intro_quest')
	},
	async *PlayerIntro2() {
		speaker('Player')
		yield 'Finally home!'
		yield 'I should go see Grandma so we can get started cooking.'
	},
	async *pickupBasket() {
		speaker('Player')
		cutSceneState.enable()
		yield 'So that\'s where I left my Basket of Ingredients!'
		yield await pickUpBasket()
		completeQuestStep('intro_quest', '0_find_basket')
		yield 'Now I can go back Home and get started on dinner with Grandma!'
		cutSceneState.disable()
	},
	async *GrandmaIntro() {
		yield await enterHouse()
		speaker('Player')
		yield 'Grandma, I`m home!'
		speaker('Grandma')
		yield 'Oh good!'
		yield 'Did you get everything we need?'
		speaker('Player')
		yield 'Yes Grandma, it\'s all here!'
		speaker('Grandma')
		yield 'Great! Now be a good dear and go into the Cellar for my Cooking Pot'
		yield 'And here, take this with you…'
		yield await displayKeyItem(assets.weapons.Ladle.scene, 'Laddle', 0.2)
		yield 'The Cellar is infested with Dust Motes right now'
		yield 'If any of them bother you, just give them a good smack with the Ladle.'
		speaker('Player')
		yield 'Okay, I\'ll be right back!'
		leaveHouse()
		completeQuestStep('intro_quest', '1_see_grandma')
	},
	async *cellar(crate: Entity, cauldronCrate: Entity, cratesToOpenQuery: Query<any>) {
		speaker('Player')
		cutSceneState.enable()
		if (crate === cauldronCrate) {
			yield 'Here it is! The Cooking Pot!'
			yield await displayKeyItem(assets.models.CookingPot.scene, 'Cooking pot', 0.3)
			yield 'What\'s this?'
			yield 'Looks like there\'s a Recipe Book in here too.'
			yield await displayKeyItem(assets.items.recipe_book.model, 'Recipe book')
			yield 'I\'ll bring this back up with me'
			for (const crate of cratesToOpenQuery) {
				ecs.removeComponent(crate, 'interactable')
				ecs.removeComponent(crate, 'onPrimary')
			}
			unlockCellar()
		} else {
			const text = getRandom([
				'Just a box of old junk',
				'Nothing in here I need right now',
				'Just some baby pictures',
				'Why do we have so much stuff?',
				'Maybe we should clean up down here.',
				'Still no Cooking Pot',
			])
			yield text
		}

		cutSceneState.disable()
	},
	// async *GrandmasDoor() {
	// 	while (true) {
	// 		cutSceneState.enable()
	// 		enterHouse()
	// 		yield false
	// 	}
	// },
	// *GrandmaStart() {
	// 	yield 'Good morning dear.'
	// 	yield 'Do you remember that we have Master Owl over for dinner tonight?'
	// 	yield 'I just need one trout and a few lemons to make him a delicious dinner.'
	// 	yield 'Can you be a dear and get them for me?'
	// 	yield 'You should be able to find lemon trees next to the river.'
	// 	addQuest('grandma_start')
	// 	leaveHouse()
	// },
	// *GrandmasHouse() {
	// 	while (true) {
	// 		yield t(dialog.grandma.hello)
	// 		yield t(dialog.grandma.howareyoudoing)
	// 		if (hasQuest('grandma_1') && !hasCompletedQuest('grandma_1')) {
	// 			if (canCompleteQuest('grandma_1')) {
	// 				yield 'Oh you brought me the roasted carrots I asked for!'
	// 				yield 'You\'re such a lovely granddaughter'
	// 				completeQuest('grandma_1')
	// 			} else {
	// 				if (!hasItem(i => 'seed' in itemsData[i.name])) {
	// 					yield 'Oh you don\'t have any seeds!'
	// 					yield 'Here, let me give you a few'
	// 					addItemToPlayer({ name: 'carrot_seeds', quantity: 10 })
	// 				} else {
	// 					yield 'Are you having trouble roasting the carrots?'
	// 				}
	// 			}
	// 		} else if (!hasEaten() && !hasItem('cookie')) {
	// 			yield 'Are you hungry? Here, have a cookie'
	// 			addItemToPlayer({ name: 'cookie', quantity: 1 })
	// 		} else if (!hasCompletedQuest('grandma_1')) {
	// 			yield 'Could you bring me some roasted carrots?'
	// 			addQuest('grandma_1')
	// 		} else {
	// 			yield 'Thanks again for these delicious roasted carrots'
	// 		}
	// 		leaveHouse()
	// 		yield false
	// 	}
	// },
	// *Jack() {
	// 	while (true) {
	// 		lockPlayer()
	// 		if (hasCompletedQuest('jack_1')) {
	// 			yield 'The soup was delicious!'
	// 		} else if (!hasQuest('jack_1')) {
	// 			yield 'Hello!'
	// 			yield 'I am so hungry but all I have is this lousy bean'
	// 			yield 'The guy who sold it to me said it was magic'
	// 			yield 'but so far nothing happened'
	// 			yield 'Tell you what, bring me some food and I\'ll give you the bean.'
	// 			yield 'Deal?'
	// 			addQuest('jack_1')
	// 		} else if (canCompleteQuest('jack_1')) {
	// 			completeQuest('jack_1')
	// 			yield 'Oh thank you for the carrot soup!'
	// 			yield 'I was so hungry'
	// 			yield 'Here is the magic bean'
	// 			addItemToPlayer({ name: 'magic_bean', quantity: 1 })
	// 			yield 'Maybe you can grow something with it?'
	// 		}
	// 		unlockPlayer()
	// 		// yield false
	// 	}
	// },
	// *Seller() {
	// 	while (true) {
	// 		lockPlayer()
	// 		yield 'Want to buy something?'
	// 		yield 'Have a look at what I have available!'
	// 		unlockPlayer()
	// 		// yield false
	// 	}
	// },
	// *Alice() {
	// 	if (!hasQuest('alice_1')) {
	// 		yield 'Hello!'
	// 		yield 'I seem to have drank the wrong potion and it made me tiny'
	// 		yield 'I can\'t do anything when I\'m this size!'
	// 		yield 'Do you know how I could get to my regular size?'
	// 	}
	// 	if (!hasItem('hummus')) {
	// 		if (hasCompletedQuest('jack_1') && !hasQuest('alice_1')) {
	// 			yield 'oh you found a magic bean?'
	// 			yield 'maybe that could help me get to my regular size!'
	// 			addQuest('alice_1')
	// 			// yield false
	// 		}
	// 		while (true) {
	// 			yield 'have you found anything?'
	// 			yield 'Being this tiny is actually really dangerous'
	// 			yield 'The other day a caterpillar almost stepped on me!'
	// 			// yield false
	// 		}
	// 	} else {
	// 		yield 'this looks really good!'
	// 		yield 'let me have a taste'
	// 		aliceJumpDown()
	// 	}
	// },
	// *AliceBig() {
	// 	yield 'Oh no, this won\'t do!'
	// 	yield 'I\'m as big as a house!'
	// 	yield 'do you think you could try another meal to bring me to a regular size?'
	// 	// yield false
	// 	while (true) {
	// 		yield 'be careful down there, I don\'t want to step on you'
	// 		// yield false
	// 	}
	// },
	// *AliceBigAfter() {
	// 	while (true) {
	// 		yield 'Being this huge is not much better'
	// 		yield 'I keep stomping on everything!'
	// 		// yield false
	// 	}
	// },
} as const satisfies Partial<Record<string, (...args: any) => Dialog>>