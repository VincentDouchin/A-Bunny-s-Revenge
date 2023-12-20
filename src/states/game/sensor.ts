import { ColliderDesc } from '@dimforge/rapier3d-compat'
import { ecs, world } from '@/global/init'

const withSensorQuery = ecs.with('sensor', 'group', 'body')
const addTarget = () => withSensorQuery.onEntityAdded.subscribe((entity) => {
	const sensorDesc = ColliderDesc.ball(0.01).setTranslation(0, 1, 5).setSensor(true)
	const sensorCollider = world.createCollider(sensorDesc, entity.body)
	ecs.addComponent(entity, 'sensorCollider', sensorCollider)
})
const removeTarget = () => withSensorQuery.with('sensorCollider').onEntityRemoved.subscribe((entity) => {
	world.removeCollider(entity.sensorCollider, true)
})

export const target = [addTarget, removeTarget]