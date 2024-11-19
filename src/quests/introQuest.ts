import type { enemy } from '@/constants/enemies'
import type { QuestStep } from '@/constants/quests'
import type { Entity } from '@/global/entity'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Query, With } from 'miniplex'
import { Faction, Interactable } from '@/global/entity'
import { cookedMealEvent, harvestCropEvent, showTutorialEvent } from '@/global/events'
import { assets, ecs, inputManager, levelsData, questManager, save } from '@/global/init'
import { app } from '@/global/states'
import { modelColliderBundle } from '@/lib/models'
import { RoomType } from '@/states/dungeon/generateDungeon'
import { cropBundle } from '@/states/farm/farming'
import { stopPlayer } from '@/states/game/movePlayer'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from '@/states/game/spawnPlayer'
import { displayKeyItem } from '@/ui/KeyItem'
import { TutorialWindow } from '@/ui/Tutorial'
import { addItemToPlayer, enterHouse, leaveHouse, movePlayerTo, sleepPlayer, speaker, unlockRecipe } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { addActors, isInMap } from './questHelpers'

const enemiesQuery = ecs.with('faction').where(e => e.faction === Faction.Enemy)
const cratesQuery = ecs.with('crate').without('interactable')
const cratesToOpenQuery = ecs.with('crate').with('interactable', 'onPrimary')
const dungeonQuery = ecs.with('dungeon')
const playerQuery = ecs.with('player', 'position', 'rotation', 'targetRotation', 'state')
const spotsQuery = ecs.with('plantableSpot', 'position', 'entityId')
const plantableSpotsQuery = spotsQuery.without('planted')
const plantedQuery = spotsQuery.with('planted')
const doorQuery = ecs.with('door', 'position')
const clearingDoorQuery = doorQuery.where(e => e.door === 'clearing')
const introDoorQuery = doorQuery.where(e => e.door === 'intro')
const CARROTS_TO_HARVEST = 3

export const introQuest = questManager.createQuest({
	name: 'Cook a meal for the festival',
	state: 'introQuest',
	steps: [{
		key: '0_find_basket',
		description: 'Find your basket of ingredients',
	}, {
		key: '1_see_grandma',
		description: 'Talk to grandma',
	}, {
		key: '2_find_pot',
		description: 'Find the cooking pot in the cellar',
	}, {
		key: '3_bring_pot_to_grandma',
		description: 'Bring the pot',
	}, {
		key: '4_get_carrots',
		description: 'Get some carrots for the meal',
		items: [{ name: 'carrot', quantity: 4 }],
	}, {
		key: '5_cook_meal',
		description: 'Make a carrot soup for the festival',
	}] as QuestStep[],
	data: {
		planted: [],
		harvested: [],
		tuto: false,
	} as {
		planted: string[]
		harvested: string[]
		tuto: boolean
	},
} as const)

// ! Basket

const cellarDoorQuery = ecs.with('door').where(e => e.door === 'cellar')

introQuest.untilIsComplete('2_find_pot', () => {
	cellarDoorQuery.onEntityAdded.subscribe((e) => {
		ecs.addComponent(e, 'doorLocked', true)
	})
	return () => {
		for (const entity of cellarDoorQuery) {
			ecs.removeComponent(entity, 'doorLocked')
		}
	}
})

const introQuestDialogs = {
	async *PlayerIntro1(player: With<Entity, 'state'>) {
		speaker('Player')
		app.enable('cutscene')
		await sleepPlayer()
		yield 'Huh?'
		yield 'Where am I?'
		yield '...'
		yield 'Oh that\'s right'
		yield '#GOLD#Grandma#GOLD# sent me into the #GREEN#Woods#GREEN# to get some ingredients for the Cooking Festival.'
		yield 'I laid down for a moment to rest and I guess I fell asleep'
		yield 'I should try to find my way back…'
		if (inputManager.controls() !== 'touch') {
			showTutorialEvent.emit(TutorialWindow.Movement)
		}
		player.state = 'idle'
		ecs.reindex(player)
		app.disable('cutscene')
		introQuest.unlock()
	},

	async *pickupBasket(basket: Entity) {
		speaker('Player')
		app.enable('cutscene')
		yield 'So that\'s where I left my #BLUE#basket#BLUE!'
		ecs.remove(basket)
		yield await displayKeyItem(assets.models.basket.scene, 'Basket of ingredients', 0.6)
		introQuest.complete('0_find_basket')
		yield 'Now I can go back #GREEN#Home#GREEN# and get started on dinner with Grandma!'
		app.disable('cutscene')
	},
	async *PlayerIntro2() {
		speaker('Player')
		app.enable('cutscene')
		yield 'Finally home!'
		yield 'I should go see #GOLD#Grandma#GOLD# so we can get started cooking.'
		app.disable('cutscene')
		save.started = true
	},
	async *findCauldron(cratesToOpenQuery: Query<any>) {
		speaker('Player')
		app.enable('cutscene')
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
		introQuest.complete('2_find_pot')

		app.disable('cutscene')
	},
	*openCrate(index: number) {
		speaker('Player')
		app.enable('cutscene')
		yield [
			'Just a box of old junk',
			'Nothing in here I need right now',
			'Just some baby pictures',
			'Why do we have so much stuff?',
			'Maybe we should clean up down here.',
			'Still no Cooking Pot',
		][index]
		app.disable('cutscene')
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
		yield 'Great! Now be a good dear and go into the cellar for my #BLUE#Cooking Pot#BLUE#'
		yield 'And here, take this with you…'
		yield await displayKeyItem(assets.weapons.Ladle.scene, 'Laddle', 0.2)
		yield 'The Cellar is infested with Dust Motes right now'
		yield 'If any of them bother you, just give them a good smack with the Ladle.'
		speaker('Player')
		yield 'Okay, I\'ll be right back!'
		leaveHouse()
		introQuest.complete('1_see_grandma')
	},
	*GrandmaIntro2() {
		speaker('Player')
		yield 'I got it, Grandma!'
		yield 'I also found #BLUE#this#BLUE# !'
		speaker('Grandma')
		yield 'Oh, that\'s the #BLUE#Recipe Book#BLUE# I bought from that mysterious Traveling Merchant!'
		yield 'I haven\'t even had a chance to look through it yet.'
		speaker('Player')
		yield 'I wonder if there are any good recipes in it.'
		speaker('Grandma')
		yield 'No idea. Let\'s have a look.'
		speaker('Player')
		yield '...'
		speaker('Grandma')
		yield '...'
		speaker('Player')
		unlockRecipe('carrot_soup')
		yield 'That looks so delicious!'
		speaker('Grandma')
		yield 'Yeah, it does!'
		speaker('Player')
		yield 'Grandma, can we please make that for the Festival instead?'
		speaker('Grandma')
		yield 'Hmm… well it looks like we already have most of the ingredients.'
		yield 'You\'ll just need to do some gardening to get the Carrots.'
		speaker('Player')
		yield 'Sounds good! I\'ll do that!'
		speaker('Grandma')
		yield 'Remember to plant some more carrots after harvesting them!'
		addItemToPlayer({ name: 'carrot_seeds', quantity: CARROTS_TO_HARVEST })
		introQuest.complete('3_bring_pot_to_grandma')
		leaveHouse()
	},
	*ItsTimeToCook() {
		speaker('Player')
		yield 'Now that I harvested the carrots I can cook something for the festival!'
	},
	*turnAwayFromDoor(player: With<Entity, 'position' | 'state'>, callback: () => void) {
		app.enable('cutscene')
		stopPlayer()
		speaker('Player')
		yield 'I should go help grandma cook something for the festival before going.'
		movePlayerTo(new Vector3(0, 0, -20).add(player.position)).then(() => {
			app.disable('cutscene')
			callback()
		})
	},
	*dontEnterCellar() {
		speaker('Player')
		yield 'I shouldn\'t enter the cellar without a weapon, #GOLD#Grandma#GOLD# told me it was infested with Dust Motes'
	},

}
introQuest.addSubscribers(() => clearingDoorQuery.onEntityAdded.subscribe((e) => {
	ecs.update(e, { doorLocked: true })
}))

introQuest.untilIsComplete('0_find_basket', () => {
	introDoorQuery.onEntityAdded.subscribe((e) => {
		ecs.update(e, { doorLocked: true })
	})
	return () => {
		for (const door of introDoorQuery) {
			ecs.removeComponent(door, 'doorLocked')
		}
	}
})

const turnAwayFromDoor = () => {
	let closeToDoor = false
	return () => {
		for (const door of clearingDoorQuery) {
			for (const player of playerQuery) {
				if (door.position.distanceTo(player.position) < 20 && !closeToDoor) {
					closeToDoor = true
					ecs.add({ dialog: introQuestDialogs.turnAwayFromDoor(player, () => closeToDoor = false) })
				}
			}
		}
	}
}
introQuest.onUpdate(turnAwayFromDoor())

export const startIntro = async () => {
	const player = playerQuery.first
	if (player) {
		ecs.add({
			dialog: introQuestDialogs.PlayerIntro1(player),
		})
	}
}

export const enableCutscene = () => {
	app.enable('cutscene')
	return () => app.disable('cutscene')
}

const isPlayerFirstEnteringFarm = () => !introQuest.hasCompletedStep('1_see_grandma') && introQuest.hasCompletedStep('0_find_basket') && app.isDisabled('mainMenu')

introQuest.addSubscribers(() => playerQuery.onEntityAdded.subscribe(() => {
	if (isPlayerFirstEnteringFarm() && isInMap('farm')) {
		ecs.add({ dialog: introQuestDialogs.PlayerIntro2() })
	}
}))
// ! Cellar
introQuest.addSubscribers(() => {
	let cratesOpened = 0
	return enemiesQuery.onEntityRemoved.subscribe(() => {
		if (enemiesQuery.size === 1 && dungeonQuery.first?.dungeon.plan.type === 'cellar' && !introQuest.hasCompletedStep('2_find_pot')) {
			for (const crate of cratesQuery) {
				ecs.update(crate, {
					interactable: Interactable.Open,
					async onPrimary(_e, player) {
						player.playerAnimator?.playOnce('interact')
						ecs.removeComponent(crate, 'onPrimary')
						ecs.removeComponent(crate, 'interactable')
						const dialog = cratesOpened < 6 ? introQuestDialogs.openCrate(cratesOpened) : introQuestDialogs.findCauldron(cratesToOpenQuery)
						cratesOpened += 1
						ecs.add({ dialog })
					},
				})
			}
		}
	})
})
// ! Carrots
introQuest.untilIsComplete('4_get_carrots', () => {
	plantedQuery.onEntityAdded.subscribe((e) => {
		if (introQuest.data.planted.includes(e.entityId)) {
			ecs.addComponent(e.planted, 'questMarker', [introQuest.marker('4_get_carrots')])
		}
	})
})

// display carrots
introQuest.addSubscribers(() => plantableSpotsQuery.onEntityAdded.subscribe((e) => {
	const questData = introQuest.data
	if (
		!introQuest.hasCompletedStep('3_bring_pot_to_grandma')
		&& questData
		&& (
			questData.planted?.length < CARROTS_TO_HARVEST
			|| (
				!questData.harvested.includes(e.entityId)
				&& questData.planted.includes(e.entityId)
			)
		)
	) {
		const crop = cropBundle(false, { luck: 0, name: 'carrot', planted: 0, stage: 3, watered: false })
		delete crop.interactable
		const planted = ecs.add({
			...crop,
			parent: e,
			position: new Vector3(),
			questMarker: [introQuest.marker('4_get_carrots')],
		})
		introQuest.onComplete('3_bring_pot_to_grandma', () => {
			ecs.update(planted, { interactable: Interactable.Harvest })
			ecs.update(e, { planted })
		})

		if (!questData.planted.includes(e.entityId)) {
			questData.planted.push(e.entityId)
		}
	}
}))

introQuest.addSubscribers(() => harvestCropEvent.subscribe((entityId, crop) => {
	if (
		crop === 'carrot'
		&& !introQuest.hasCompletedStep('4_get_carrots')
		&& introQuest.data.planted.includes(entityId)
	) {
		introQuest.data.harvested.push(entityId)
		if (introQuest.data.harvested.length === CARROTS_TO_HARVEST) {
			introQuest.complete('4_get_carrots')
			ecs.add({ dialog: introQuestDialogs.ItsTimeToCook() })
		}
	}
}))
export const spawnIntroPlayer = addActors({
	playerIntro: () => {
		const player = { ...playerBundle(PLAYER_DEFAULT_HEALTH, null) }
		player.playerAnimator.playAnimation('sleeping')
		player.state = 'managed'
		return player
	},
})
export const introQuestActors = addActors({

	basketIntro: () => {
		const model = assets.models.basket.scene.clone()
		model.scale.setScalar(5)
		const bundle = modelColliderBundle(model, RigidBodyType.Fixed, true)
		return {
			...bundle,
			questMarker: [introQuest.marker('0_find_basket')],
			interactable: Interactable.PickUp,
			onPrimary(basket) {
				ecs.removeComponent(basket, 'interactable')
				ecs.add({ dialog: introQuestDialogs.pickupBasket(basket) })
			},
		}
	},
	houseDoor: () => {
		return {
			questMarker: [introQuest.marker('1_see_grandma'), introQuest.marker('3_bring_pot_to_grandma')],
			questMarkerPosition: new Vector3(0, 15, 5),
			onPrimary(entity) {
				if (!introQuest.hasCompletedStep('1_see_grandma') && entity.questMarkerContainer) {
					ecs.add({ dialog: introQuestDialogs.GrandmaIntro() })
					return
				}
				if (introQuest.hasCompletedStep('2_find_pot') && !introQuest.hasCompletedStep('3_bring_pot_to_grandma')) {
					enterHouse().then(() => {
						ecs.add({ dialog: introQuestDialogs.GrandmaIntro2() })
					})
				}
			},
		}
	},
	cellarDoor: () => ({
		questMarker: [introQuest.marker('2_find_pot')],
		questMarkerPosition: new Vector3(0, 10, -5),
		async onPrimary(e, player) {
			if (introQuest.hasCompletedStep('1_see_grandma')) {
				app.enable('cutscene')
				await e.cellarDoorAnimator?.playClamped('doorOpen')
				app.disable('cutscene')
				const enemies: enemy[] = introQuest.hasCompletedStep('2_find_pot') ? [] : ['soot_sprite', 'soot_sprite', 'soot_sprite', 'soot_sprite']
				const cellar: Room = {
					plan: levelsData.levels.find(l => l.type === 'cellar')!,
					doors: {},
					enemies,
					type: RoomType.Entrance,
					encounter: null,
					chest: true,
				}
				const playerPosition = player.position!.clone().add(new Vector3(-5, 0, 0))
				const playerRotation = player.rotation!.clone()
				save.playerPosition = playerPosition.toArray()
				save.playerRotation = playerRotation.toArray()
				await sleep(1000)
				app.enable('dungeon', {
					direction: 'cellar',
					weapon: 'Ladle',
					dungeon: cellar,
					dungeonLevel: 1,
					playerHealth: player.maxHealth!.value,
					firstEntry: true,
				})
			} else {
				ecs.add({ dialog: introQuestDialogs.dontEnterCellar() })
			}
		},
	}),
})

// display farming tuto
introQuest.betweenSteps('3_bring_pot_to_grandma', '4_get_carrots', () => {
	if (introQuest.data.tuto) return
	for (const player of playerQuery) {
		for (const crop of plantedQuery) {
			if (player.position.distanceTo(crop.position) < 5) {
				showTutorialEvent.emit(TutorialWindow.Farming)
				introQuest.data.tuto = true
			}
		}
	}
})
// cook meal
introQuest.addSubscribers(() => cookedMealEvent.subscribe((cooking, recipe) => {
	if (cooking === 'cookingPot' && recipe === 'carrot_soup') {
		for (const entity of clearingDoorQuery) {
			ecs.removeComponent(entity, 'doorLocked')
		}
		introQuest.complete('5_cook_meal')
	}
}))
