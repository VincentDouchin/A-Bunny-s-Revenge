import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { getIntersections } from './sensor'
import { ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

const playerQuery = ecs.with('playerControls', 'sensor', 'position', 'rotation')
const interactingQuery = ecs.with('collider', 'interactable', 'position')
const losingInteractionQuery = interactingQuery.with('interactionContainer')

export const touchItem = () => {
	for (const player of playerQuery) {
		let lastDist = Number.POSITIVE_INFINITY
		let lastEntity: Entity | null = null
		const intersection = getIntersections(player)
		for (const item of interactingQuery) {
			if (intersection === item.collider) {
				const sensorPos = new Vector3(0, 0, 3).applyQuaternion(player.rotation).add(player.position)
				const dist = item.position.distanceTo(sensorPos)
				if (dist < lastDist) {
					lastDist = dist
					lastEntity = item
				}
			}
		}
		if (lastEntity !== null && !lastEntity?.interactionContainer) {
			const interactionContainer = new CSS2DObject(document.createElement('div'))
			ecs.update(lastEntity, { interactionContainer, outline: true })
		}
		for (const item of losingInteractionQuery) {
			if (lastEntity !== item) {
				ecs.removeComponent(item, 'interactionContainer')
				ecs.removeComponent(item, 'outline')
			}
		}
	}
}
const outlineQuery = ecs.with('model', 'outline')
export const removeOutlines = () => outlineQuery.onEntityRemoved.subscribe((e) => {
	e.model.traverse(node => node.layers.disable(1))
})

export const addOutline = () => outlineQuery.onEntityAdded.subscribe((e) => {
	e.model.traverse(node => node.layers.enable(1))
})
export const removeInteractableOutline = () => interactingQuery.onEntityRemoved.subscribe((e) => {
	ecs.removeComponent(e, 'outline')
})