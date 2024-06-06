import type { items } from '@assets/assets'
import { ActiveCollisionTypes, ShapeType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import type { Query, With } from 'miniplex'
import { Vector3 } from 'three'
import { range } from './mapFunctions'
import { sleep } from './sleep'
import { addTag } from '@/lib/hierarchy'
import { cutSceneState } from '@/global/states'
import { assets, coroutines, ecs, gameTweens } from '@/global/init'
import type { Entity } from '@/global/entity'
import { quests } from '@/constants/quests'
import type { QuestName, QuestStepKey } from '@/constants/quests'

import { dialogs } from '@/constants/dialogs'
import type { Item } from '@/constants/items'
import { recipes } from '@/constants/recipes'
import { addItem, removeItem, save, updateSave } from '@/global/save'
import { playSound } from '@/global/sounds'
import { getWorldPosition } from '@/lib/transforms'
import { addToast } from '@/ui/Toaster'
import { addToHand } from '@/states/game/equip'

const playerQuery = ecs.with('player', 'position', 'collider')
const movingPlayerQuery = playerQuery.with('movementForce')
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
					player.movementForce = dest.clone().sub(player.position).normalize()
					yield
				}
				player.movementForce.setScalar(0)
				resolve()
			})
		}
	})
}
export const playerInventoryQuery = ecs.with('inventoryId', 'inventory', 'inventorySize', 'player', 'currentHealth', 'maxHealth')
export const unlockRecipe = (item: items) => {
	updateSave(s => s.unlockedRecipes.push(item))
	addToast({ type: 'recipe', recipe: item })
}
export const addItemToPlayer = (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		if (item.health) {
			player.currentHealth = Math.min(player.maxHealth.value, player.currentHealth + item.health)
		} else if (item.recipe) {
			unlockRecipe(item.recipe)
		} else {
			addItem(player, item)
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
			return save.quests[name]?.[i] === true || step.items?.every((item) => {
				return player.inventory.some((saveItem) => {
					return saveItem && saveItem.name === item.name && saveItem.quantity >= item.quantity
				})
			})
		})
	}
}

export const completeQuest = <Q extends QuestName>(name: Q) => {
	if (canCompleteQuest(name)) {
		updateSave((s) => {
			const quest = s.quests[name]
			if (quest) {
				for (let i = 0; i < quests[name].steps.length; i++) {
					const step = quests[name].steps[i]
					for (const item of step.items ?? []) {
						removeItemFromPlayer(item)
					}
					quest[i] = true
				}
			}
		})
	}
}

const questMarkersQuery = ecs.with('questMarker', 'questMarkerContainer')
export const addQuest = async (name: QuestName) => {
	if (!(name in save.quests)) {
		await updateSave(s => s.quests[name] = range(0, quests[name].steps.length, () => false))
		const toUnlock: items[] = []
		for (const step of quests[name].steps) {
			for (const item of step.items) {
				if (!save.unlockedRecipes.includes(item.name) && recipes.some(r => r.output.name === item.name)) {
					toUnlock.push(item.name)
				}
			}
		}
		for (const unlockedRecipe of toUnlock) {
			await unlockRecipe(unlockedRecipe)
		}
		for (const npc of questMarkersQuery) {
			if (npc.questMarker === name) {
				ecs.removeComponent(npc, 'questMarker')
				ecs.removeComponent(npc, 'questMarkerContainer')
			}
		}

		addToast({ type: 'quest', quest: name })
	}
}

export const completeQuestStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	updateSave((s) => {
		const quest = s.quests[questName]
		if (quest) {
			const index = quests[questName].steps.findIndex(s => s.key === step)
			quest[index] = true
			addToast({ type: 'questStep', step: quests[questName].steps[index] })
		}
	})
}

export const hasCompletedQuest = (name: QuestName) => {
	return Boolean(save.quests[name]?.every(step => step === true))
}

export const hasCompletedStep = <Q extends QuestName>(questName: Q, step: QuestStepKey<Q>) => {
	const index = quests[questName]?.steps.findIndex(s => s.key === step)
	return save.quests[questName]?.[index]
}

export const hasQuest = (name: QuestName) => {
	return name in save.quests
}

export const questsUnlocks: Record<QuestName, () => boolean> = {
	grandma_1: () => true,
	jack_1: () => true,
	alice_1: () => hasCompletedQuest('jack_1'),
}

export const hasItem = (itemName: items | ((item: Item) => boolean)) => {
	for (const item of save.inventories.player) {
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
	setSensor(doorQuery, true)
	setSensor(houseQuery, true)
	const house = houseQuery.first

	if (house) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		movePlayerTo(house.position)
		addTag(house, 'activeDialog')
		await sleep(500)
		await house.houseAnimator.playClamped('DoorClose')
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
}
export const leaveHouse = async () => {
	const house = houseQuery.first
	const door = doorQuery.first
	if (house && door) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		await movePlayerTo(new Vector3(0, 0, 50).applyQuaternion(house.rotation).add(house.position))
		cutSceneState.disable()
		await sleep(1000)
		await house.houseAnimator.playClamped('DoorClose')
		setSensor(houseQuery, false)
		setSensor(doorQuery, false)
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
}

// ! Alice
const aliceQuery = ecs.with('npcName', 'kayAnimator', 'position', 'rotation', 'model', 'group', 'collider', 'body').where(e => e.npcName === 'Alice')

export const aliceJumpDown = async () => {
	for (const alice of aliceQuery) {
		const followPosition = () => {
			alice.body.setTranslation(getWorldPosition(alice.group).add(new Vector3(0, 10, 0)), true)
		}
		gameTweens.add(new Tween(alice.position).to(new Vector3(0, -15, 5).applyQuaternion(alice.rotation).add(alice.position), alice.kayAnimator.animationClips.Jump_Full_Long.duration * 1000 / 2 - 200))
		followPosition()
		await alice.kayAnimator.playClamped('Jump_Full_Long', { timeScale: 2 })
		alice.kayAnimator.playAnimation('Idle')
		const hummus = assets.items.hummus.model.clone()
		hummus.rotateZ(Math.PI / 2 * 1.3)
		addToHand(alice, hummus)
		await sleep(1000)
		await alice.kayAnimator.playOnce('Use_Item')
		removeItemFromPlayer({ name: 'hummus', quantity: 1 })
		hummus.removeFromParent()
		alice.kayAnimator.playAnimation('Idle')
		alice.collider.setSensor(false)
		alice.collider.setActiveCollisionTypes(ActiveCollisionTypes.ALL)
		gameTweens.add(new Tween(alice.group.scale).to(alice.group.scale.clone().multiplyScalar(8), 2000).easing(Easing.Bounce.InOut).onUpdate((scale) => {
			if (alice.collider.shape.type === ShapeType.Cylinder) {
				alice.collider.setRadius(scale.length())
			}
		}).onComplete(() => {
			ecs.removeComponent(alice, 'dialog')
			completeQuestStep('alice_1', 'makeHummus')
			ecs.update(alice, {
				dialog: dialogs.AliceBig(),
				activeDialog: true,
			})
		}))
	}
}