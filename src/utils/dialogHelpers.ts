import type { items } from '@assets/assets'
import type { Query, With } from 'miniplex'
import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { range } from './mapFunctions'
import { sleep } from './sleep'
import { cutSceneState } from '@/global/states'
import { addItem, coroutines, ecs, removeItem, save } from '@/global/init'
import type { Entity } from '@/global/entity'
import { quests } from '@/constants/quests'
import type { QuestMarkers, QuestName, QuestStepKey } from '@/constants/quests'

import { applyMove, applyRotate } from '@/behaviors/behaviorHelpers'
import type { Item } from '@/constants/items'
import { recipes } from '@/constants/recipes'
import { playSound } from '@/global/sounds'
import { heartEmitter } from '@/particles/heartParticles'
import { displayQuestMarker } from '@/states/game/dialog'
import { addToast } from '@/ui/Toaster'
import { Direction } from '@/lib/directions'

const npcNameQuery = ecs.with('npcName')
export const speaker = (name?: Entity['npcName']) => {
	for (const npc of npcNameQuery) {
		if (npc.npcName === name && !npc.dialogContainer) {
			const dialogContainer = new CSS2DObject(document.createElement('div'))
			if (npc.dialogHeight) {
				dialogContainer.position.y = npc.dialogHeight
			}
			ecs.update(npc, { dialogContainer })
		} else {
			ecs.removeComponent(npc, 'dialogContainer')
		}
	}
}

export const unlockCellar = () => {
	const cellarDoorMarker = ecs.with('markerName').where(e => e.markerName === 'cellar-door').first
	if (cellarDoorMarker) {
		ecs.update(cellarDoorMarker, {
			door: Direction.E,
			colliderDesc: ColliderDesc.cuboid(10, 20, 3).setSensor(false),
			bodyDesc: RigidBodyDesc.fixed(),
		})
	}
}

const playerQuery = ecs.with('player', 'position', 'collider')
const movingPlayerQuery = playerQuery.with('body', 'targetRotation', 'rotation')
export const houseQuery = ecs.with('npcName', 'position', 'collider', 'rotation', 'houseAnimator').where(({ npcName }) => npcName === 'Grandma')
export const doorQuery = ecs.with('npcName', 'collider').where(({ npcName }) => npcName === 'door')
export const setSensor = <T extends With<Entity, 'collider'>>(query: Query<T>, sensor: boolean) => {
	for (const { collider } of query) {
		collider.setSensor(sensor)
	}
}
export const lockPlayer = () => {
	for (const player of playerQuery) {
		ecs.removeComponent(player, 'movementForce')
	}
}
export const unlockPlayer = () => {
	for (const player of playerQuery) {
		ecs.addComponent(player, 'movementForce', new Vector3())
	}
}
export const movePlayerTo = (dest: Vector3) => {
	return new Promise<void>((resolve) => {
		for (const player of movingPlayerQuery) {
			player.movementForce = dest.clone().sub(player.position).normalize()
			coroutines.add(function* () {
				while (player.position.distanceTo(dest) > 2) {
					applyMove(player, dest.clone().sub(player.position).normalize())
					applyRotate(player, dest.clone().sub(player.position).normalize())
					yield
				}
				player.movementForce?.setScalar(0)
				resolve()
			})
		}
	})
}
export const sleepPlayer = async () => {
	const player = playerQuery.first
	if (player) {
		player.modifiers?.addModifier('sleepingPowder')
		await sleep(5000)
		await player.playerAnimator?.playClamped('wakeUp')
		ecs.update(player, { state: 'idle' })
	}
}
export const playerInventoryQuery = ecs.with('inventoryId', 'inventory', 'inventorySize', 'player', 'currentHealth', 'maxHealth')
export const unlockRecipe = (item: items) => {
	save.unlockedRecipes.push(item)
	addToast({ type: 'recipe', recipe: item })
}
export const addItemToPlayer = async (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		if (item.health) {
			ecs.add({
				parent: player,
				emitter: heartEmitter(),
				position: new Vector3(),
				autoDestroy: true,
			})
			player.currentHealth = Math.min(player.maxHealth.value, player.currentHealth + item.health)
		} else if (item.recipe) {
			unlockRecipe(item.recipe)
		} else {
			await addItem(player, item)
			addToast({ type: 'addedItem', item: item.name, quantity: item.quantity })
		}
	}
}
export const removeItemFromPlayer = (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		removeItem(player, item)
		addToast({ type: 'removedItem', item: item.name, quantity: item.quantity })
	}
}

// ! Quests

export const canCompleteQuest = (name: QuestName) => {
	const player = playerInventoryQuery.first
	if (player) {
		return quests[name].steps.every((step, i) => {
			return save.quests[name]?.[i] === true || step.items?.every((item: Item) => {
				return player.inventory.some((saveItem) => {
					return saveItem && saveItem.name === item.name && saveItem.quantity >= item.quantity
				})
			})
		})
	}
}

export const completeQuest = <Q extends QuestName>(name: Q) => {
	if (canCompleteQuest(name)) {
		const quest = save.quests[name]
		if (quest) {
			for (let i = 0; i < quests[name].steps.length; i++) {
				const step = quests[name].steps[i]
				for (const item of step.items ?? []) {
					removeItemFromPlayer(item)
				}
				quest[i] = true
			}
		}
	}
}

const questMarkersQuery = ecs.with('questMarker')
export const addQuest = async (name: QuestName) => {
	if (!(name in save.quests)) {
		save.quests[name] = range(0, quests[name].steps.length, () => false)
		const toUnlock: items[] = []
		for (const step of quests[name].steps) {
			for (const item of step.items as unknown as Item[]) {
				if (!save.unlockedRecipes.includes(item.name) && recipes.some(r => r.output.name === item.name)) {
					toUnlock.push(item.name)
				}
			}
		}
		for (const unlockedRecipe of toUnlock) {
			await unlockRecipe(unlockedRecipe)
		}
		for (const npc of questMarkersQuery) {
			const marker = npc.questMarker.find(q => q.split('#')[0] === name)
			if (marker) {
				const markers = [...npc.questMarker].filter(m => m !== marker)
				ecs.removeComponent(npc, 'questMarker')
				ecs.removeComponent(npc, 'questMarkerContainer')
				ecs.addComponent(npc, 'questMarker', markers)
			}
		}

		addToast({ type: 'quest', quest: name })
	}
}

export const completeQuestStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	const quest = save.quests[questName]
	if (quest) {
		const index = quests[questName].steps.findIndex(s => s.key === step)
		quest[index] = true
		addToast({ type: 'questStep', step: quests[questName].steps[index] })
		for (const entity of questMarkersQuery) {
			displayQuestMarker(entity)
			if (entity.questMarker.includes(`${questName}#${step}`)) {
				ecs.removeComponent(entity, 'questMarkerContainer')
			}
		}
	}
}

export const hasCompletedQuest = (name: QuestName) => {
	return Boolean(save.quests[name]?.every(step => step === true))
}

export const hasCompletedStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	const index = quests[questName]?.steps.findIndex(s => s.key === step)
	return save.quests[questName]?.[index]
}

export const hasQuest = <T extends QuestName>(name: QuestMarkers) => {
	const [quest, key] = name.split('#') as [T, QuestStepKey<T>]
	const index = quests[quest].steps.findIndex(step => step.key === key)
	return quest in save.quests && save.quests[quest]?.[index]
}

export const showMarker = <T extends QuestName>(name: QuestMarkers) => {
	const [quest, key] = name.split('#') as [T, QuestStepKey<T>]
	const index = quests[quest].steps.findIndex(step => step.key === key)
	if (index === 0) {
		return quests[quest].unlock()
	} else {
		return quest in save.quests && save.quests[quest]?.[index - 1] && !save.quests[quest]?.[index]
	}
}

export const hasItem = (itemName: items | ((item: Item) => boolean)) => {
	if (!save.inventories.player) return
	for (const item of save.inventories.player.filter(Boolean)) {
		if (typeof itemName === 'string') {
			if (item.name === itemName) return true
		} else {
			if (itemName(item)) return true
		}
	}
	return false
}
export const hasEaten = () => {
	return save.modifiers.length > 0
}

export const enterHouse = async () => {
	cutSceneState.enable()
	setSensor(doorQuery, true)
	setSensor(houseQuery, true)
	const house = houseQuery.first

	if (house) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		movePlayerTo(house.position)
		await sleep(500)
		await house.houseAnimator.playClamped('DoorClose')
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
}
export const leaveHouse = async () => {
	const house = houseQuery.first
	if (house) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		await movePlayerTo(new Vector3(0, 0, 50).applyQuaternion(house.rotation).add(house.position))
		cutSceneState.disable()
		await sleep(1000)
		await house.houseAnimator.playClamped('DoorClose')
		setSensor(houseQuery, false)
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
	cutSceneState.disable()
}

// ! Alice
// const aliceQuery = ecs.with('npcName', 'kayAnimator', 'position', 'rotation', 'model', 'group', 'collider', 'body').where(e => e.npcName === 'Alice')

export const aliceJumpDown = async () => {
	// for (const alice of aliceQuery) {
	// 	const followPosition = () => {
	// 		alice.body.setTranslation(getWorldPosition(alice.group).add(new Vector3(0, 10, 0)), true)
	// 	}
	// 	tweens.add({
	// 		from: alice.position.clone(),
	// 		to: new Vector3(0, -15, 5).applyQuaternion(alice.rotation).add(alice.position),
	// 		duration: alice.kayAnimator.animationClips.Jump_Full_Long.duration * 1000 / 2 - 200,
	// 		onUpdate: f => alice.position.copy(f),
	// 	})
	// 	followPosition()
	// 	await alice.kayAnimator.playClamped('Jump_Full_Long', { timeScale: 2 })
	// 	alice.kayAnimator.playAnimation('Idle')
	// 	const hummus = assets.items.hummus.model.clone()
	// 	hummus.rotateZ(Math.PI / 2 * 1.3)
	// 	addToHand(alice, hummus)
	// 	await sleep(1000)
	// 	await alice.kayAnimator.playOnce('Use_Item')
	// 	removeItemFromPlayer({ name: 'hummus', quantity: 1 })
	// 	hummus.removeFromParent()
	// 	alice.kayAnimator.playAnimation('Idle')
	// 	alice.collider.setSensor(false)
	// 	alice.collider.setActiveCollisionTypes(ActiveCollisionTypes.ALL)
	// 	tweens.add({
	// 		from: alice.group.scale.clone(),
	// 		to: alice.group.scale.clone().multiplyScalar(8),
	// 		duration: 2000,
	// 		ease: reverseEasing(createBackIn(3)),
	// 		onUpdate: (f) => {
	// 			if (alice.collider.shape.type === ShapeType.Cylinder) {
	// 				alice.collider.setRadius(f.length())
	// 			}
	// 			alice.group.scale.copy(f) },
	// 		onComplete: () => {
	// 			ecs.removeComponent(alice, 'dialog')
	// 			completeQuestStep('alice_1', 'makeHummus')
	// 			ecs.update(alice, {
	// 				dialog: dialogs.AliceBig(),
	// 				activeDialog: true,
	// 			})
	// 		},
	// 	})
	// }
}