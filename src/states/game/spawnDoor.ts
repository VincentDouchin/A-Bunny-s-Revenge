import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight } from 'three'
import type { Entity } from '@/global/entity'
import { ecs, world } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState, genDungeonState } from '@/global/states'
import type { direction } from '@/lib/directions'
import type { System } from '@/lib/state'
import { getRotationFromDirection } from '@/lib/transforms'

const getDoorLayer = (opacity: number) => {
	const sizeFactor = (3 - opacity) / 3
	return new Mesh(
		new PlaneGeometry(20 * sizeFactor, 30 * sizeFactor),
		new MeshBasicMaterial({ color: 0x000000, opacity: opacity / 3, transparent: true, side: DoubleSide }),
	)
}
const doorGroup = () => {
	const group = new Group()
	for (let i = 0.1; i <= 1; i += 0.1) {
		const layer = getDoorLayer(i)
		layer.position.z = 0.5 + i * 2
		group.add(layer)
	}
	group.position.y = 15
	return group
}

export const doorBundle = (to: number, direction: direction) => {
	const rotation = getRotationFromDirection(direction)
	const light = new PointLight(0xFFFFFF, 5, 50, 0.5)
	light.position.y = 10
	light.castShadow = true
	return {
		inMap: true,
		model: doorGroup(),
		bodyDesc: RigidBodyDesc.fixed().lockRotations(),
		colliderDesc: ColliderDesc.cuboid(10, 15, 1).setSensor(true),
		door: { direction, to },
		rotation,
		// light,
	} as const satisfies Entity
}

const doorQuery = ecs.with('collider', 'door')
const playerQuery = ecs.with('collider', 'playerControls').without('ignoreDoor')
export const collideWithDoor: System<DungeonRessources> = ({ dungeon }) => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				if (dungeon.rooms.length === door.door.to) {
					campState.enable({ previousState: 'dungeon' })
				} else {
					dungeonState.enable({ dungeon, direction: door.door.direction, roomIndex: door.door.to })
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
			if (door.door.direction === player.ignoreDoor && !world.intersectionPair(player.collider, door.collider)) {
				ecs.removeComponent(player, 'ignoreDoor')
			}
		}
	}
}