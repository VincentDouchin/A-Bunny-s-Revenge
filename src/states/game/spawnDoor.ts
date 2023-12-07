import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three'
import { ecs, world } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState } from '@/global/states'
import { type direction, otherDirection } from '@/lib/directions'
import type { System } from '@/lib/state'
import { entries } from '@/utils/mapFunctions'

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
const rotations = {
	left: 1,
	right: -1,
	front: 0,
	back: 2,
}
export const doorBundle = (index: number, direction: direction) => {
	const rotation = new Quaternion()

	rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2 * rotations[direction])
	return {
		inMap: true,
		rotation,
		model: doorGroup(),
		bodyDesc: RigidBodyDesc.fixed().lockRotations(),
		colliderDesc: ColliderDesc.cuboid(10, 15, 1).setSensor(true),
		door: { index, direction },
	} as const
}

export const spawnDungeonDoors: System<DungeonRessources> = ({ door }) => {
	const doors = {
		front: new Vector3(0, 0, 48),
		back: new Vector3(0, 0, -48),
		left: new Vector3(-48, 0, 0),
		right: new Vector3(48, 0, 0),
	} as const
	for (const [doorDirection, position] of entries(doors)) {
		ecs.add({
			...doorBundle(door, doorDirection),
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