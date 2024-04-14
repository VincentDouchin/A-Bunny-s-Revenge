import { ecs, world } from '@/global/init'

const withSensorDescQuery = ecs.with('sensorDesc', 'group', 'body')
const addTarget = () => withSensorDescQuery.onEntityAdded.subscribe((entity) => {
	const sensorCollider = world.createCollider(entity.sensorDesc, entity.body)
	ecs.addComponent(entity, 'sensorCollider', sensorCollider)
})
const addedSensorQuery = withSensorDescQuery.with('sensorCollider')
const removeTarget = () => addedSensorQuery.onEntityRemoved.subscribe((entity) => {
	world.removeCollider(entity.sensorCollider, true)
})

export const target = [addTarget, removeTarget]