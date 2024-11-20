import type { app } from '@/global/states'
import type { With } from 'miniplex'
import type { ComponentsOfType, Entity } from '../global/entity'
import { ecs } from '../global/init'
import { type Plugin, set } from './app'

const mapQuery = ecs.with('map')
export const inMap = () => {
	const map = mapQuery.first
	if (map) {
		return { parent: map }
	} else {
		throw new Error('map not found')
	}
}
export const addChildren = () => ecs.onEntityAdded.subscribe((entity) => {
	const parent = entity.parent
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
const withChildrenQuery = ecs.with('withChildren').without('bodyDesc')

const addChildrenCallBack = () => {
	for (const entity of withChildrenQuery) {
		entity.withChildren(entity)
		ecs.removeComponent(entity, 'withChildren')
	}
}
const onDestroyQuery = ecs.with('onDestroy')
const onDestroyCallBack = () => onDestroyQuery.onEntityRemoved.subscribe((e) => {
	e.onDestroy()
})

export const hierarchyPlugin: Plugin<typeof app> = (app) => {
	app.addSubscribers('default', onDestroyCallBack, addChildren, removeChildren, despanwChildren)
	app.onPostUpdate('default', addChildrenCallBack)
}
export const addTag = (entity: Entity, tag: ComponentsOfType<true>) => {
	ecs.addComponent(entity, tag, true)
}
export const removeEntityRef = <C extends ComponentsOfType<Entity>>(entity: With<Entity, C>, component: C) => {
	const ref = entity[component]
	if (ref) {
		ecs.removeComponent(entity, component)
		ecs.reindex(entity)
		ecs.remove(ref)
	}
}
export const removeStateEntityPlugin: Plugin<typeof app> = (app) => {
	for (const state of app.states) {
		const stateEntities = ecs.with('stateEntity').where(e => e.stateEntity === state)
		app.onExit(state, () => {
			for (const stateEntity of stateEntities) {
				ecs.remove(stateEntity)
			}
		})
	}
}