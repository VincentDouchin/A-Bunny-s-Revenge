import type { Query, With } from 'miniplex'
import { Vector3 } from 'three'
import { enumerate, range } from './mapFunctions'
import type { Entity } from '@/global/entity'
import { coroutines, ecs } from '@/global/init'
import { cutSceneState } from '@/global/states'
import { addTag } from '@/lib/hierarchy'
import { quests } from '@/constants/quests'
import type { QuestName } from '@/constants/quests'

import { removeItem, save, updateSave } from '@/global/save'

const playerQuery = ecs.with('player', 'position', 'collider', 'movementForce')
const houseQuery = ecs.with('npcName', 'position', 'collider').where(({ npcName }) => npcName === 'Grandma')
const doorQuery = ecs.with('npcName', 'worldPosition', 'collider').where(({ npcName }) => npcName === 'door')
export const pandaQuery = ecs.with('animator', 'npcName').where(({ npcName }) => npcName === 'Panda')
const setSensor = <T extends With<Entity, 'collider'>>(query: Query<T>, sensor: boolean) => {
	for (const { collider } of query) {
		collider.setSensor(sensor)
	}
}

export const movePlayerTo = (dest: Vector3) => {
	return new Promise<void>((resolve) => {
		for (const player of playerQuery) {
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

export const enterHouse = () => {
	setSensor(doorQuery, true)
	setSensor(houseQuery, true)
	const house = houseQuery.first

	if (house) {
		movePlayerTo(house.position)
		addTag(house, 'activeDialog')
	}
}
export const leaveHouse = () => {
	const house = houseQuery.first
	const door = doorQuery.first
	if (house && door) {
		movePlayerTo(new Vector3(0, 0, -10).add(door.worldPosition)).then(() => {
			cutSceneState.disable()
			setSensor(houseQuery, false)
			setSensor(doorQuery, false)
		})
	}
}

// ! Quests

export const canCompleteQuest = (name: QuestName) => {
	return quests[name].steps.every((step, i) => {
		return save.quests[name]?.[i] === true || step.items?.every((item) => {
			return Object.values(save.items).some((saveItem) => {
				return saveItem.name === item.name && saveItem.quantity >= item.quantity
			})
		})
	})
}

export const completeQuest = (name: QuestName) => {
	if (canCompleteQuest(name)) {
		updateSave((s) => {
			const quest = s.quests[name]
			if (quest) {
				for (const [step, i] of enumerate(quests[name].steps)) {
					for (const item of step.items ?? []) {
						removeItem(item)
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
