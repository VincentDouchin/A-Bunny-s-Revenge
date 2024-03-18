import type { Query, With } from 'miniplex'
import { Vector3 } from 'three'
import { enumerate, range } from './mapFunctions'
import { sleep } from './sleep'
import type { QuestName } from '@/constants/quests'
import { quests } from '@/constants/quests'
import type { Entity } from '@/global/entity'
import { coroutines, ecs } from '@/global/init'
import { cutSceneState } from '@/global/states'
import { addTag } from '@/lib/hierarchy'

import type { Item } from '@/constants/items'
import { addItem, removeItem, save, updateSave } from '@/global/save'
import { playSound } from '@/global/sounds'

const playerQuery = ecs.with('player', 'position', 'collider')
const movingPlayerQuery = playerQuery.with('movementForce')
const houseQuery = ecs.with('npcName', 'position', 'collider', 'rotation', 'houseAnimator').where(({ npcName }) => npcName === 'Grandma')
const doorQuery = ecs.with('npcName', 'collider').where(({ npcName }) => npcName === 'door')
const setSensor = <T extends With<Entity, 'collider'>>(query: Query<T>, sensor: boolean) => {
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
					yield
				}
				player.movementForce.setScalar(0)
				resolve()
			})
		}
	})
}
export const playerInventoryQuery = ecs.with('inventoryId', 'inventory', 'inventorySize', 'player')

export const addItemToPlayer = (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		addItem(player, item)
	}
}
export const removeItemFromPlayer = (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		removeItem(player, item)
	}
}

export const enterHouse = async () => {
	setSensor(doorQuery, true)
	setSensor(houseQuery, true)
	const house = houseQuery.first

	if (house) {
		playSound('glitchedtones_Door+Bedroom+Open+01', { volume: -12 })
		await house.houseAnimator.playClamped('DoorOpen')
		movePlayerTo(house.position)
		addTag(house, 'activeDialog')
		await sleep(500)
		await house.houseAnimator.playClamped('DoorClose')
		playSound('zapsplat_household_door_backdoor_close_002_56921')
	}
}
export const leaveHouse = async () => {
	const house = houseQuery.first
	const door = doorQuery.first
	if (house && door) {
		playSound('glitchedtones_Door+Bedroom+Open+02', { volume: -12 })
		await house.houseAnimator.playClamped('DoorOpen')
		movePlayerTo(new Vector3(0, 0, 30).applyQuaternion(house.rotation).add(house.position)).then(() => {
			cutSceneState.disable()
			setSensor(houseQuery, false)
			setSensor(doorQuery, false)
		})
		await sleep(500)
		await house.houseAnimator.playClamped('DoorClose')
		playSound('zapsplat_household_door_backdoor_close_002_56921')
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

export const completeQuest = (name: QuestName) => {
	if (canCompleteQuest(name)) {
		updateSave((s) => {
			const quest = s.quests[name]
			if (quest) {
				for (const [step, i] of enumerate(quests[name].steps)) {
					for (const item of step.items ?? []) {
						removeItemFromPlayer(item)
					}
					quest[i] = true
				}
			}
		})
	}
}

export const addQuest = (name: QuestName) => {
	if (!(name in save.quests)) {
		updateSave((s) => {
			s.quests[name] = range(0, quests[name].steps.length, () => false)
		})
	}
}

export const hasCompletedQuest = (name: QuestName) => {
	return save.quests[name]?.every(step => step === true)
}

export const hasQuest = (name: QuestName) => {
	return name in save.quests && !hasCompletedQuest(name)
}
