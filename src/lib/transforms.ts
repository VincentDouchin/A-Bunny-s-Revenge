import type { Object3D, Object3DEventMap } from 'three'
import { Quaternion, Vector3 } from 'three'
import type { Collider } from '@dimforge/rapier3d-compat'
import type { State } from './state'
import type { direction } from './directions'
import { ecs, world } from '@/global/init'

export const getWorldPosition = (obj: Object3D<Object3DEventMap>) => {
	const pos = new Vector3()
	obj.getWorldPosition(pos)
	return pos
}

const positionQuery = ecs.with('position', 'group')
export const getRotationFromDirection = (direction: direction) => {
	const rotations = {
		west: 1,
		east: -1,
		north: 0,
		south: 2,
	}
	const rotation = new Quaternion()
	rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2 * rotations[direction])
	return rotation
}
const updateMeshPosition = () => {
	for (const { position, group } of positionQuery) {
		group.position.x = position.x
		group.position.y = position.y
		group.position.z = position.z
	}
}

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
			ecs.removeComponent(entity, 'worldPosition')
		}
	}
}

const bodiesQuery = ecs.with('body', 'position').where(({ body }) => body.isDynamic() || body.isKinematic())
const updateGroupPosition = () => {
	for (const entity of bodiesQuery) {
		const { body, position } = entity
		const bodyPos = body.translation()

		position.x = bodyPos.x
		position.y = bodyPos.y
		position.z = bodyPos.z
	}
}
const rotationQuery = ecs.with('rotation')
const updateRotation = () => {
	for (const entity of rotationQuery) {
		if (entity.body) {
			entity.body.setRotation(entity.rotation, true)
		}
		if (entity.group) {
			entity.group.setRotationFromQuaternion(entity.rotation)
		}
	}
}

export const transformsPlugin = (state: State) => {
	state
		.addSubscriber(addWorldPosition)
		.onUpdate(updateGroupPosition, updateMeshPosition, updateRotation)
		.onPostUpdate(updateWorldPosition)
}

export const isInIntersectionWithCollider = (collider: Collider) => {
	let isInIntersection = false
	world.intersectionPairsWith(collider, () => isInIntersection = true)
	return isInIntersection
}