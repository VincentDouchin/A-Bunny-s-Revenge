import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { RoomType } from '../dungeon/dungeonTypes'
import { ecs, world } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState, genDungeonState } from '@/global/states'
import type { System } from '@/lib/state'
import { otherDirection } from '@/lib/directions'

const getDoorLayer = (opacity: number) => {
	const sizeFactor = (3 - opacity) / 3
	const mesh = new Mesh(
		new PlaneGeometry(20 * sizeFactor, 30 * sizeFactor),
		new MeshBasicMaterial({ color: 0x000000, opacity: opacity / 3, transparent: true, side: DoubleSide }),
	)
	mesh.material.depthWrite = false
	return mesh
}
export const doorGroup = () => {
	const group = new Group()
	for (let i = 0.1; i <= 1; i += 0.1) {
		const layer = getDoorLayer(i)
		layer.position.z = 0.5 + i * 2
		group.add(layer)
	}
	group.position.y = 15
	return group
}

const doorQuery = ecs.with('collider', 'door')
const playerQuery = ecs.with('collider', 'playerControls').without('ignoreDoor')
export const collideWithDoor: System<DungeonRessources> = ({ dungeon }) => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				const nextRoom = dungeon.doors[door.door]
				if (nextRoom) {
					dungeonState.enable({ dungeon: nextRoom, direction: otherDirection[door.door] })
				} else {
					if (dungeon.type === RoomType.Boss) {
						campState.enable({ previousState: 'dungeon' })
					} else {
						campState.enable({})
					}
				}
			}
		}
	}
}
export const collideWithDoorCamp = () => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				genDungeonState.enable()
			}
		}
	}
}

const playerInDoor = ecs.with('playerControls', 'ignoreDoor', 'collider')
export const allowDoorCollision: System<DungeonRessources> = () => {
	for (const player of playerInDoor) {
		for (const door of doorQuery) {
			if (door.door === player.ignoreDoor && !world.intersectionPair(player.collider, door.collider)) {
				ecs.removeComponent(player, 'ignoreDoor')
			}
		}
	}
}