import type { With } from 'miniplex'
import type { Object3D } from 'three'
import type { ComponentsOfType, Entity } from '../global/entity'

import type { Plugin } from './app'

import type { app } from '@/global/states'

import { Group } from 'three'
import { RenderGroup } from '../global/entity'
import { ecs } from '../global/init'

import { set } from './app'

const gameSceneQuery = ecs.with('scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.Game)

export const inGameScene = <T extends Entity>(e: T) => {
	const sceneEntity = gameSceneQuery.first
	if (sceneEntity) {
		e.parent = sceneEntity
		return e
	} else {
		throw new Error('map not found')
	}
}

const mapQuery = ecs.with('map')
export const inMap = <T extends Entity>(e: T) => {
	const map = mapQuery.first
	if (map) {
		e.parent = map
		return e
	} else {
		throw new Error('map not found')
	}
}
const parentQuery = ecs.with('parent')
export const addChildren = () => parentQuery.onEntityAdded.subscribe((entity) => {
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
export const removeChildren = () => parentQuery.onEntityRemoved.subscribe((entity) => {
	entity.parent.children?.delete(entity)
})

export const deSpawnChildren = () => ecs.with('children').onEntityRemoved.subscribe((entity) => {
	for (const children of entity.children) {
		ecs.remove(children)
	}
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
export const deSpawnOfType = (...components: (keyof Entity)[]) => {
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
	app.addSubscribers('default', onDestroyCallBack, addChildren, removeChildren, deSpawnChildren)
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

const sceneQuery = ecs.with('scene', 'group')

export const addToScene = (...components: Array<Exclude<ComponentsOfType<Object3D>, 'group'>>): Plugin<typeof app> => (app) => {
	for (const component of components) {
		const query = ecs.with(component, 'position')
		const withoutGroup = query.without('group')
		app.addSubscribers('default', () => sceneQuery.onEntityAdded.subscribe((e) => {
			e.scene.add(e.group)
		}))
		app.addSubscribers('default', () => withoutGroup.onEntityAdded.subscribe((entity) => {
			const group = new Group()
			group.position.copy(entity.position)
			group.add(entity[component])
			ecs.addComponent(entity, 'group', group)
			const children = entity.children
			if (children) {
				for (const child of children) {
					if (child.group && !child.group.parent) {
						group.add(child.group)
					}
				}
			}
		}))
		const withGroup = query.with('group')
		app.addSubscribers('default', () => withGroup.onEntityAdded.subscribe((entity) => {
			if (entity[component]) entity.group?.add(entity[component])
		}))
		app.addSubscribers('default', () => withGroup.onEntityRemoved.subscribe((entity) => {
			if (entity[component]) entity[component].removeFromParent()
		}))
	}
	const withGroup = ecs.with('group')
	app.addSubscribers('default', () => withGroup.onEntityAdded.subscribe((entity) => {
		if (entity.parent?.group) {
			entity.parent.group.add(entity.group)
		}
		if (entity.position) {
			entity.group.position.x = entity.position.x
			entity.group.position.y = entity.position.y
			entity.group.position.z = entity.position.z
		}
	}))
	app.addSubscribers('default', () => withGroup.onEntityRemoved.subscribe((entity) => {
		entity.group.removeFromParent()
	}))
}
