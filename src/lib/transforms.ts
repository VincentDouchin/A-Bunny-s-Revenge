import type { Collider } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Quaternion, Vector3 } from 'three'
import { Direction } from './directions'
import type { State } from './state'
import { ecs, time, world } from '@/global/init'

export const getWorldPosition = (obj: Object3D<Object3DEventMap>) => {
	const pos = new Vector3()
	obj.getWorldPosition(pos)
	return pos
}
export const getWorldRotation = (obj: Object3D<Object3DEventMap>) => {
	const pos = new Quaternion()
	obj.getWorldQuaternion(pos)
	return pos
}

const positionQuery = ecs.with('position', 'group')
export const getRotationFromDirection = (direction: Direction) => {
	const rotations: Record<Direction, number> = {
		[Direction.W]: 1,
		[Direction.E]: -1,
		[Direction.N]: 0,
		[Direction.S]: 2,
	}
	const rotation = new Quaternion()
	rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2 * rotations[direction])
	return rotation
}

const swapPosition = () => positionQuery.onEntityAdded.subscribe((e) => {
	e.group.position.copy(e.position)
	e.position = e.group.position
})

const bodiesWithoutWorldPositionQuery = ecs.with('bodyDesc', 'group').without('worldPosition')
const addWorldPosition = () => bodiesWithoutWorldPositionQuery.onEntityAdded.subscribe((entity) => {
	const worldPosition = new Vector3()
	entity.group.getWorldPosition(worldPosition)
	ecs.addComponent(entity, 'worldPosition', worldPosition)
})
const worldPositionQuery = ecs.with('group', 'worldPosition', 'body')
const updateWorldPosition = () => {
	for (const entity of worldPositionQuery) {
		const { group, worldPosition, body } = entity
		group.getWorldPosition(worldPosition)
		if (body.isFixed()) {
			body.setTranslation(worldPosition, true)
			worldPositionQuery.remove(entity)
		}
	}
}

const bodiesQuery = ecs.with('body', 'position').where(({ body }) => body.isDynamic() || body.isKinematic())
const updateGroupPosition = () => {
	for (const entity of bodiesQuery) {
		const { body, position } = entity
		const bodyPos = body.translation()
		position.copy(bodyPos)
	}
}
const rotationQuery = ecs.with('rotation')
const rotationWithBodyQuery = rotationQuery.with('body')
const updateRotation = () => {
	for (const entity of rotationQuery) {
		if (entity.group) {
			entity.group.setRotationFromQuaternion(entity.rotation)
		}
		if (entity.targetRotation) {
			entity.rotation.slerp(entity.targetRotation, time.delta / 70)
		}
	}
	for (const entity of rotationWithBodyQuery) {
		entity.body.setRotation(entity.rotation, true)
	}
}

export const transformsPlugin = (state: State) => {
	state
		.addSubscriber(addWorldPosition, swapPosition)
		.onPreUpdate(updateGroupPosition, updateRotation)
		.onPostUpdate(updateWorldPosition)
}

export const isInIntersectionWithCollider = (collider: Collider) => {
	let isInIntersection = false
	world.intersectionPairsWith(collider, () => isInIntersection = true)
	return isInIntersection
}