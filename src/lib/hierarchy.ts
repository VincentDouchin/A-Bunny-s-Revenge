import { ecs } from '../global/init'
import type { Entity } from '../global/entity'

export const addChildren = () => ecs.onEntityAdded.subscribe((entity) => {
	if (entity.parent) {
		if (entity.parent.children) {
			entity.parent.children.add(entity)
		}
		else {
			ecs.addComponent(entity.parent, 'children', new Set([entity]))
		}
	}
})

export const despanwChildren = () => ecs.with('children').onEntityRemoved.subscribe((entity) => {
	for (const children of entity.children) {
		ecs.remove(children)
	}
})

export const removeChildren = () => ecs.with('parent').onEntityRemoved.subscribe((entity) => {
	entity.parent.children?.delete(entity)
})
export const removeParent = (entity: Entity) => {
	if (entity.parent) {
		entity.parent.children?.delete(entity)
		ecs.removeComponent(entity, 'parent')
		if (entity.group) {
			entity.group.removeFromParent()
		}
	}
}