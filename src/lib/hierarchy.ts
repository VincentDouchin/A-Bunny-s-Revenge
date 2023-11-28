import { ecs } from '../global/init'
import type { Entity } from '../global/entity'
import type { State } from './state'
import { set } from './state'

const mapQuery = ecs.with('map')
export const addChildren = () => ecs.onEntityAdded.subscribe((entity) => {
	const parent = entity.inMap ? mapQuery.first : entity.parent
	if (parent) {
		if (parent.children) {
			parent.children.add(entity)
		}
		else {
			ecs.addComponent(parent, 'children', new Set([entity]))
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
export const despawnOfType = (...components: (keyof Entity)[]) => {
	return set(components.map((component) => {
		const query = ecs.with(component)
		return () => {
			for (const entity of query) {
				ecs.remove(entity)
			}
		}
	}))
}

export const hierarchyPlugin = (state: State) => {
	state.addSubscriber(addChildren, removeChildren, despanwChildren)
}