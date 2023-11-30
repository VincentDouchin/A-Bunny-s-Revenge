import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { BoxGeometry, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { ecs, world } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState } from '@/global/states'
import { type direction, otherDirection } from '@/lib/directions'
import type { System } from '@/lib/state'
import { entries } from '@/utils/mapFunctions'

const doorBundle = (index: number, direction: direction, init = false) => {
	const rotation = new Quaternion()
	if (direction === 'left' || direction === 'right') {
		rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
	}
	return {
		inMap: true,
		rotation,
		mesh: new Mesh(
			new BoxGeometry(20, 50, 2),
			new MeshBasicMaterial({ color: init ? 0x111111 : 0xFFFFFF }),
		),
		bodyDesc: RigidBodyDesc.fixed().lockRotations(),
		colliderDesc: ColliderDesc.cuboid(10, 25, 1).setSensor(true),
		door: { index, direction },
	} as const
}

export const spawnCampDoor = () => {
	ecs.add({
		...doorBundle(1, 'front'),
		position: new Vector3(0, 0, 100),
	})
}
export const spawnDungeonDoors: System<DungeonRessources> = ({ door, direction }) => {
	const doors = {
		front: new Vector3(0, 0, 48),
		back: new Vector3(0, 0, -48),
		left: new Vector3(-48, 0, 0),
		right: new Vector3(48, 0, 0),
	} as const
	for (const [doorDirection, position] of entries(doors)) {
		ecs.add({
			...doorBundle(door, doorDirection, doorDirection === direction),
			position,
		})
	}
}

const doorQuery = ecs.with('collider', 'door')
const playerQuery = ecs.with('collider', 'playerControls')
export const collideWithDoor: System<DungeonRessources> = ({ direction }) => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (direction !== door.door.direction) {
				if (world.intersectionPair(door.collider, player.collider)) {
					const roomsLeft = door.door.index - 1
					if (roomsLeft) {
						dungeonState.enable({ door: roomsLeft, direction: otherDirection[door.door.direction] })
					} else {
						campState.enable({ previousState: 'dungeon' })
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
				const roomsLeft = door.door.index
				dungeonState.enable({ door: roomsLeft, direction: otherDirection[door.door.direction] })
			}
		}
	}
}