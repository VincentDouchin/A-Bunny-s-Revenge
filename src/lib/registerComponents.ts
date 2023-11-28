import type { Object3D } from 'three'
import { Group } from 'three'
import type { ComponentsOfType } from '../global/entity'
import { ecs } from '../global/init'
import type { State } from './state'
import { sceneQuery } from '@/global/rendering'

export const addToScene = (...components: Array<Exclude<ComponentsOfType<Object3D>, 'group'>>) => (state: State) => {
	for (const component of components) {
		const query = ecs.with(component, 'position')
		const withoutGroup = query.without('group')
		state.onEnter(() => withoutGroup.onEntityAdded.subscribe((entity) => {
			const group = new Group()
			group.position.x = entity.position.x
			group.position.y = entity.position.y
			group.position.z = entity.position.z
			group.add(entity[component])
			ecs.addComponent(entity, 'group', group)
		}))
		const withGroup = query.with('group')
		state.onEnter(() => withGroup.onEntityAdded.subscribe((entity) => {
			entity.group.add(entity[component])
		}))
		state.onEnter(() => withGroup.onEntityRemoved.subscribe((entity) => {
			entity[component].removeFromParent()
		}))
	}
	const withGroup = ecs.with('group')
	state.onEnter(() => withGroup.onEntityAdded.subscribe((entity) => {
		for (const { scene } of sceneQuery) {
			if (entity.parent?.group) {
				entity.parent.group.add(entity.group)
			} else {
				scene.add(entity.group)
			}
		}
		if (entity.position) {
			entity.group.position.x = entity.position.x
			entity.group.position.y = entity.position.y
			entity.group.position.z = entity.position.z
		}
	}))
	state.onEnter(() => withGroup.onEntityRemoved.subscribe((entity) => {
		entity.group.removeFromParent()
	}))
}
