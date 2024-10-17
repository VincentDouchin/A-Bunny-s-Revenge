import type { Object3D } from 'three'
import type { State } from './state'
import { Group } from 'three'
import { type ComponentsOfType, RenderGroup } from '../global/entity'
import { ecs } from '../global/init'

const gameSceneQuery = ecs.with('scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.Game)
export const addToScene = (...components: Array<Exclude<ComponentsOfType<Object3D>, 'group'>>) => (state: State) => {
	for (const component of components) {
		const query = ecs.with(component, 'position')
		const withoutGroup = query.without('group')
		state.addSubscriber(() => withoutGroup.onEntityAdded.subscribe((entity) => {
			const group = new Group()
			group.position.x = entity.position.x
			group.position.y = entity.position.y
			group.position.z = entity.position.z
			group.add(entity[component])
			ecs.addComponent(entity, 'group', group)
		}))
		const withGroup = query.with('group')
		state.addSubscriber(() => withGroup.onEntityAdded.subscribe((entity) => {
			if (entity[component]) entity.group.add(entity[component])
		}))
		state.addSubscriber(() => withGroup.onEntityRemoved.subscribe((entity) => {
			if (entity[component]) entity[component].removeFromParent()
		}))
	}
	const withGroup = ecs.with('group')
	state.addSubscriber(() => withGroup.onEntityAdded.subscribe((entity) => {
		if (entity.parent?.group) {
			entity.parent.group.add(entity.group)
		} else {
			for (const { scene } of gameSceneQuery) {
				scene.add(entity.group)
			}
		}
		if (entity.position) {
			entity.group.position.x = entity.position.x
			entity.group.position.y = entity.position.y
			entity.group.position.z = entity.position.z
		}
	}))
	state.addSubscriber(() => withGroup.onEntityRemoved.subscribe((entity) => {
		entity.group.removeFromParent()
	}))
}
