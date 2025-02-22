import type { app } from '@/global/states'
import type { Object3D } from 'three'
import type { Plugin } from './app'
import { Group } from 'three'
import { type ComponentsOfType, RenderGroup } from '../global/entity'
import { ecs } from '../global/init'

const gameSceneQuery = ecs.with('scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.Game)
export const addToScene = (...components: Array<Exclude<ComponentsOfType<Object3D>, 'group'>>): Plugin<typeof app> => (app) => {
	for (const component of components) {
		const query = ecs.with(component, 'position')
		const withoutGroup = query.without('group')
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
	app.addSubscribers('default', () => withGroup.onEntityRemoved.subscribe((entity) => {
		entity.group.removeFromParent()
	}))
}
