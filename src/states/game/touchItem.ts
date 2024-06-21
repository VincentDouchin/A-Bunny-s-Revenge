import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Entity } from '@/global/entity'
import { ecs, world } from '@/global/init'

const playerQuery = ecs.with('playerControls', 'sensorCollider', 'position', 'rotation')
const interactingQuery = ecs.with('collider', 'interactable', 'position')
const losingInteractionQuery = interactingQuery.with('interactionContainer')

export const touchItem = () => {
	for (const player of playerQuery) {
		let lastDist = Number.POSITIVE_INFINITY
		let lastEntity: Entity | null = null
		for (const item of interactingQuery) {
			const intersection = world.intersectionPair(player.sensorCollider, item.collider)
			if (intersection) {
				const sensorPos = new Vector3(0, 0, 5).applyQuaternion(player.rotation).add(player.position)
				const dist = item.position.distanceTo(sensorPos)
				if (dist < lastDist) {
					lastDist = dist
					lastEntity = item
				}
			}
		}
		if (lastEntity !== null && !lastEntity?.interactionContainer) {
			const interactionContainer = new CSS2DObject(document.createElement('div'))
			ecs.update(lastEntity, { interactionContainer })

			ecs.update(lastEntity, { outline: true })
			ecs.reindex(lastEntity)
		}
		for (const item of losingInteractionQuery) {
			if (lastEntity !== item) {
				ecs.removeComponent(item, 'interactionContainer')
				if (item.outline && item.group) {
					item.group.traverse(node => node.layers.disable(1))
				}
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