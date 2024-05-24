import type { Object3D } from 'three'
import type { With } from 'miniplex'
import type { ComponentsOfType, Entity } from '@/global/entity'
import { ecs } from '@/global/init'

export const addToHand = (entity: With<Entity, 'model'>, model: Object3D) => {
	entity.model.traverse((node) => {
		if (node.name === 'DEF_FingerL' || node.name === 'handr') {
			node.parent?.add(model)
		}
	})
}

export const equip = (...components: ComponentsOfType<With<Entity, 'model'>>[]) => {
	return components.flatMap((component) => {
		const query = ecs.with(component, 'model')
		return [
			() => query.onEntityAdded.subscribe((e) => {
				for (const c of components) {
					if (e[c] && c !== component) {
						ecs.removeComponent(e, c)
					}
				}
				addToHand(e, e[component].model)
			}),
			() => query.onEntityRemoved.subscribe((e) => {
				e[component].model.removeFromParent()
			}),
		]
	})
}