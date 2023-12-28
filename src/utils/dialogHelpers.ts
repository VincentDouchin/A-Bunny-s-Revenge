import { Vector3 } from 'three'
import type { Query, With } from 'miniplex'
import { coroutines, ecs } from '@/global/init'
import type { Entity } from '@/global/entity'
import { addTag } from '@/lib/hierarchy'
import { cutSceneState } from '@/global/states'

const playerQuery = ecs.with('player', 'position', 'collider', 'movementForce')
const houseQuery = ecs.with('npcName', 'position', 'collider').where(({ npcName }) => npcName === 'Grandma')
const doorQuery = ecs.with('npcName', 'worldPosition', 'collider').where(({ npcName }) => npcName === 'door')

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