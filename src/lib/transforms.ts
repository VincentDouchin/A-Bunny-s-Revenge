import { Vector3 } from 'three'
import type { State } from './state'
import { ecs } from '@/global/init'

const positionQuery = ecs.with('position', 'group')
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
	for (const { group, worldPosition, body } of worldPositionQuery) {
		group.getWorldPosition(worldPosition)
		body.setTranslation(worldPosition, true)
	}
}

const bodiesQuery = ecs.with('body', 'position').where(({ body }) => body.isDynamic())
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