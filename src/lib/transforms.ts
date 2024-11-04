import type { app } from '@/global/states'
import type { Collider } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import type { Plugin } from './app'
import { ecs, time, world } from '@/global/init'
import { Quaternion, Vector3 } from 'three'
import { Direction } from './directions'

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
		try {
			if (body.isFixed()) {
				body.setTranslation(worldPosition, true)
				worldPositionQuery.remove(entity)
			}
		} catch (e) {
			console.error(e, entity)
		}
	}
}

const bodiesQuery = ecs.with('body', 'position').without('directedDynamic').where(({ body }) => body.isDynamic() || body.isKinematic())
const directedDynamicQuery = ecs.with('body', 'position').with('directedDynamic')
const updateGroupPosition = () => {
	for (const entity of bodiesQuery) {
		const { body, position } = entity
		const bodyPos = body.translation()
		position.copy(bodyPos)
	}
	for (const { body, position, group } of directedDynamicQuery) {
		body.setTranslation(position, true)
		if (group) {
			group.position.copy(position)
		}
	}
}
const rotationQuery = ecs.with('rotation')

const updateRotation = () => {
	for (const entity of rotationQuery) {
		if (entity.group) {
			entity.group.setRotationFromQuaternion(entity.rotation)
		}
		if (entity.targetRotation) {
			entity.rotation.slerp(entity.targetRotation, time.delta / 70)
		}
	}
}

export const transformsPlugin: Plugin<typeof app> = (app) => {
	app.addSubscribers('default', addWorldPosition, swapPosition)
		// Access bodies in pre update before clean up in physics plugin
		.onPreUpdate('default', updateGroupPosition, updateRotation, updateWorldPosition)
}

export const isInIntersectionWithCollider = (collider: Collider) => {
	let isInIntersection = false
	world.intersectionPairsWith(collider, () => isInIntersection = true)
	return isInIntersection
}