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
	ecs.addComponent(entity, 'worldPosition', entity.group.position)
})
const bodiesQuery = ecs.with('body', 'position')
const updateGroupPosition = () => {
	for (const { body, position } of bodiesQuery) {
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
		.addSubscribers(addWorldPosition)
		.onUpdate(updateGroupPosition, updateMeshPosition, updateRotation)
}