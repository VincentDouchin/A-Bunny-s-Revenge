import type { Object3D } from 'three'
import { Group } from 'three'
import type { State } from './state'
import type { ComponentsOfType } from '@/global/entity'
import { ecs } from '@/global/init'
import { sceneQuery } from '@/global/rendering'
import { csm } from '@/global/camera'

export const addToScene = (...components: Array<Exclude<ComponentsOfType<Object3D>, 'group'>>) => (state: State) => {
	for (const component of components) {
		const query = ecs.with(component, 'position')
		const withoutGroup = query.without('group')
		state.onPreUpdate(() => withoutGroup.onEntityAdded.subscribe((entity) => {
			if (component === 'mesh') {
				csm.setupMaterial(entity[component].material)
			}
			const group = new Group()
			group.position.x = entity.position.x
			group.position.y = entity.position.y
			group.position.z = entity.position.z

			group.add(entity[component])
			ecs.addComponent(entity, 'group', group)
		}))
		const withGroup = query.with('group')
		state.onPreUpdate(() => withGroup.onEntityAdded.subscribe((entity) => {
			for (const { scene } of sceneQuery) {
				entity.group.add(entity[component])
				if (entity.parent?.group) {
					entity.parent.group.add(entity.group)
				} else {
					scene.add(entity.group)
				}
			}
		}))
		state.onPreUpdate(() => withGroup.onEntityRemoved.subscribe((entity) => {
			entity.group.removeFromParent()
		}))
	}
}