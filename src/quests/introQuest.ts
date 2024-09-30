import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Query, With } from 'miniplex'
import { Vector3 } from 'three'
import { addActors, addQuest, completeQuestStep, hasCompletedStep } from './questHelpers'
import type { Entity } from '@/global/entity'
import { Faction, Interactable } from '@/global/entity'
import { completeQuestStepEvent, cookedMealEvent, harvestCropEvent } from '@/global/events'
import { assets, ecs, levelsData, save } from '@/global/init'
import { cutSceneState, dungeonState, mainMenuState } from '@/global/states'
import { Direction } from '@/lib/directions'
import type { State } from '@/lib/state'
import type { Room } from '@/states/dungeon/generateDungeon'
import { RoomType } from '@/states/dungeon/generateDungeon'
import { cropBundle } from '@/states/farm/farming'
import { stopPlayer } from '@/states/game/movePlayer'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from '@/states/game/spawnPlayer'
import { displayKeyItem } from '@/ui/KeyItem'
import { TutorialWindow } from '@/ui/Tutorial'
import { addItemToPlayer, enterHouse, leaveHouse, movePlayerTo, sleepPlayer, speaker, unlockRecipe } from '@/utils/dialogHelpers'
import { getRandom } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'

const enemiesQuery = ecs.with('faction').where(e => e.faction === Faction.Enemy)
const cratesQuery = ecs.with('crate').without('interactable')
const cratesToOpenQuery = ecs.with('crate').with('interactable', 'onPrimary')
const dungeonQuery = ecs.with('dungeon')
const cellarStairsQuery = ecs.with('actor', 'position', 'rotation', 'size').where(e => e.actor === 'cellarStairs')
const basketQuery = ecs.with('actor', 'position', 'rotation').where(e => e.actor === 'basketIntro')
const playerQuery = ecs.with('player', 'position', 'rotation', 'targetRotation', 'state')
const plantableSpotsQuery = ecs.with('plantableSpot', 'position', 'entityId').without('planted')
const cropsQuery = ecs.with('crop')
const dialogQuery = ecs.with('dialog')
const plantedQuery = ecs.with('planted', 'position')

const CARROTS_TO_HARVEST = 3
// ! Basket
const pickUpBasket = async () => {
	for (const basket of basketQuery) {
		const dest = basket.position.clone().add(new Vector3(0, 0, 5).applyQuaternion(basket.rotation))
		await movePlayerTo(dest)
		ecs.remove(basket)
		await displayKeyItem(assets.models.basket.scene, 'Basket of ingredients', 0.6)
	}
}

const unlockCellar = () => {
	const cellarDoorMarker = ecs.with('actor').where(e => e.actor === 'cellarStairs').first
	if (cellarDoorMarker) {
		ecs.update(cellarDoorMarker, {
			door: Direction.E,
			colliderDesc: ColliderDesc.cuboid(10, 20, 3).setSensor(false),
			bodyDesc: RigidBodyDesc.fixed(),
		})
		completeQuestStep('intro_quest', '2_find_pot')
	}
}

const introQuestDialogs = {
	async *PlayerIntro1(player: With<Entity, 'state'>) {
		speaker('Player')
		cutSceneState.enable()
		await sleepPlayer()
		yield 'Huh?'
		yield 'Where am I?'
		yield '...'
		yield 'Oh that\'s right'
		yield '#GOLD#Grandma#GOLD# sent me into the #GREEN#Woods#GREEN# to get some ingredients for the Cooking Festival.'
		yield 'I laid down for a moment to rest and I guess I fell asleep'
		yield 'I should try to find my way back…'
		ecs.add({ tutorial: TutorialWindow.Movement })
		addQuest('intro_quest')
		player.state = 'idle'
		ecs.reindex(player)
	},

	async *pickupBasket() {
		speaker('Player')
		cutSceneState.enable()
		yield 'So that\'s where I left my #BLUE#basket#BLUE!'
		yield await pickUpBasket()
		completeQuestStep('intro_quest', '0_find_basket')
		yield 'Now I can go back Home and get started on dinner with Grandma!'
		cutSceneState.disable()
	},
	async *PlayerIntro2() {
		cutSceneState.enable()
		speaker('Player')
		yield 'Finally home!'
		yield 'I should go see #GOLD#Grandma#GOLD# so we can get started cooking.'
		cutSceneState.disable()
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
		completeQuestStep('intro_quest', '1_see_grandma')
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
		completeQuestStep('intro_quest', '3_bring_pot_to_grandma')
		leaveHouse()
	},
	*ItsTimeToCook() {
		speaker('Player')
		yield 'Now that I harvested the carrots I can cook something for the festival!'
	},

}

const getCloseToBasket = () => {
	for (const basket of basketQuery) {
		for (const player of playerQuery) {
			if (player.position.distanceTo(basket.position) < 20 && dialogQuery.size === 0) {
				stopPlayer()
				ecs.add({ dialog: introQuestDialogs.pickupBasket() })
			}
		}
	}
}
export const startIntro = async () => {
	const player = playerQuery.first
	if (player) {
		ecs.add({
			dialog: introQuestDialogs.PlayerIntro1(player),
		})
	}
}

export const enableCutscene = () => {
	cutSceneState.enable()
	return () => cutSceneState.disable()
}

const isPlayerFirstEnteringFarm = () => !hasCompletedStep('intro_quest', '1_see_grandma') && hasCompletedStep('intro_quest', '0_find_basket') && mainMenuState.disabled

const playerFromIntroDialog = () => playerQuery.onEntityAdded.subscribe(() => {
	if (isPlayerFirstEnteringFarm()) {
		ecs.add({ dialog: introQuestDialogs.PlayerIntro2() })
	}
})
// ! Cellar
const spawnPlayerCellar = () => cellarStairsQuery.onEntityAdded.subscribe((e) => {
	ecs.add({
		...playerBundle(PLAYER_DEFAULT_HEALTH, 'Ladle'),
		position: e.position.clone().add(new Vector3(0, e.size.y, 0)),
		rotation: e.rotation.clone(),
		targetRotation: e.rotation.clone(),
	})
})
const makeCratesInteractable = () => enemiesQuery.onEntityRemoved.subscribe(() => {
	if (enemiesQuery.size === 1 && dungeonQuery.first?.dungeon.plan.type === 'cellar') {
		const cauldronCrate = getRandom(cratesQuery.entities)
		for (const crate of cratesQuery) {
			ecs.update(crate, {
				interactable: Interactable.Open,
				onPrimary() {
					ecs.removeComponent(crate, 'onPrimary')
					ecs.removeComponent(crate, 'interactable')
					ecs.add({
						dialog: introQuestDialogs.cellar(crate, cauldronCrate, cratesToOpenQuery),
					})
				},
			})
		}
	}
})
// ! Carrots

const addCarrotMarkers = () => cropsQuery.onEntityAdded.subscribe((e) => {
	if (!hasCompletedStep('intro_quest', '4_get_carrots')) {
		ecs.addComponent(e, 'questMarker', ['intro_quest#4_get_carrots'])
	}
})
const displayCarrots = () => plantableSpotsQuery.onEntityAdded.subscribe((e) => {
	const questData = save.quests.intro_quest && save.quests.intro_quest.data['4_get_carrots']

	if (!hasCompletedStep('intro_quest', '3_bring_pot_to_grandma') && questData && (questData.planted?.length < CARROTS_TO_HARVEST || (!questData.harvested.includes(e.entityId) && questData.planted.includes(e.entityId)))
	) {
		const crop = cropBundle(false, { luck: 0, name: 'carrot', planted: 0, stage: 3, watered: false })
		delete crop.interactable
		const planted = ecs.add({
			...crop,
			parent: e,
			position: e.position.clone(),
			questMarker: ['intro_quest#4_get_carrots'],
		})
		completeQuestStepEvent.subscribe((step) => {
			if (step === 'intro_quest#3_bring_pot_to_grandma') {
				ecs.update(planted, { interactable: Interactable.Harvest })
				ecs.update(e, { planted })
			}
		})

		if (!questData.planted.includes(e.entityId)) {
			questData.planted.push(e.entityId)
		}
	}
})
const completePickupCarrots = () => harvestCropEvent.subscribe((entityId, crop) => {
	if (
		crop === 'carrot'
		&& !hasCompletedStep('intro_quest', '4_get_carrots')
		&& save.quests.intro_quest?.data['4_get_carrots'].planted.includes(entityId)
	) {
		save.quests.intro_quest.data['4_get_carrots'].harvested.push(entityId)
		if (save.quests.intro_quest.data['4_get_carrots'].harvested.length === CARROTS_TO_HARVEST) {
			completeQuestStep('intro_quest', '4_get_carrots')
			ecs.add({ dialog: introQuestDialogs.ItsTimeToCook() })
		}
	}
})
const introQuestActors = addActors({
	playerFromIntro: (e) => {
		if (isPlayerFirstEnteringFarm()) {
			save.playerPosition = e.position.toArray()
		}
	},
	playerIntro: () => {
		const player = { ...playerBundle(PLAYER_DEFAULT_HEALTH, null) }
		player.playerAnimator.playAnimation('sleeping')
		player.state = 'managed'

		return player
	},
	basketIntro: () => {
		const model = assets.models.basket.scene.clone()
		model.scale.setScalar(5)
		return { model, questMarker: ['intro_quest#0_find_basket'] }
	},
	houseDoor: () => {
		return {
			questMarker: ['intro_quest#1_see_grandma', 'intro_quest#3_bring_pot_to_grandma'],
			questMarkerPosition: new Vector3(0, 15, 5),
			onPrimary(entity) {
				if (!hasCompletedStep('intro_quest', '1_see_grandma') && entity.questMarkerContainer) {
					ecs.add({ dialog: introQuestDialogs.GrandmaIntro() })
					return
				}
				if (hasCompletedStep('intro_quest', '2_find_pot') && !hasCompletedStep('intro_quest', '3_bring_pot_to_grandma')) {
					enterHouse().then(() => {
						ecs.add({ dialog: introQuestDialogs.GrandmaIntro2() })
					})
				}
			},
		} },
	cellarDoor: () => ({
		questMarker: ['intro_quest#2_find_pot'],
		questMarkerPosition: new Vector3(0, 10, -5),
		async onPrimary(e, player) {
			cutSceneState.enable()
			await e.cellarDoorAnimator?.playClamped('doorOpen')
			cutSceneState.disable()
			const cellar: Room = {
				plan: levelsData.levels.find(l => l.type === 'cellar')!,
				doors: { [Direction.S]: null },
				enemies: ['soot_sprite', 'soot_sprite', 'soot_sprite', 'soot_sprite'],
				type: RoomType.Entrance,
				encounter: null,
				chest: true,
			}
			const playerPosition = player.position!.clone().add(new Vector3(-5, 0, 0))
			const playerRotation = player.rotation!.clone()
			save.playerPosition = playerPosition.toArray()
			save.playerRotation = playerRotation.toArray()
			await sleep(1000)
			dungeonState.enable({
				direction: Direction.N,
				weapon: 'Ladle',
				dungeon: cellar,
				dungeonLevel: 1,
				playerHealth: player.maxHealth!.value,
				firstEntry: true,
			})
		},
	}),
})

const displayFarmingTutorial = () => {
	if (hasCompletedStep('intro_quest', '3_bring_pot_to_grandma') && !hasCompletedStep('intro_quest', '4_get_carrots') && save.quests.intro_quest?.data['4_get_carrots'].tuto === false) {
		for (const player of playerQuery) {
			for (const crop of plantedQuery) {
				if (player.position.distanceTo(crop.position)) {
					ecs.add({ tutorial: TutorialWindow.Farming })
					save.quests.intro_quest.data['4_get_carrots'].tuto = true
				}
			}
		}
	}
}

const cookMeal = () => cookedMealEvent.subscribe((cooking, recipe) => {
	if (cooking === 'cookingPot' && recipe === 'carrot_soup') {
		completeQuestStep('intro_quest', '5_cook_meal')
	}
})

export const introQuestPlugin = (state: State) => {
	state
		.addPlugins(introQuestActors)
		.addSubscriber(playerFromIntroDialog, spawnPlayerCellar, makeCratesInteractable, displayCarrots, addCarrotMarkers, completePickupCarrots, cookMeal)
		.onUpdate(getCloseToBasket, displayFarmingTutorial)
}
