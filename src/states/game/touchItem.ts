import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { Vector3 } from 'three'
import { ecs, world } from '@/global/init'
import type { Entity } from '@/global/entity'

const playerQuery = ecs.with('playerControls', 'sensorCollider', 'position')
const items = ecs.with('collider', 'interactable', 'position')
const interactingQuery = items
const losingInteractionQuery = items.with('interactionContainer')

export const touchItem = () => {
	for (const player of playerQuery) {
		let lastDist = Number.POSITIVE_INFINITY
		let lastEntity: Entity | null = null
		for (const item of interactingQuery) {
			const intersection = world.intersectionPair(player.sensorCollider, item.collider)
			if (intersection) {
				const sensorPos = player.sensorCollider.translation()
				const dist = item.position.distanceTo(new Vector3(sensorPos.x, sensorPos.y, sensorPos.z))
				if (dist < lastDist) {
					lastDist = dist
					lastEntity = item
				}
			}
		}
		if (lastEntity !== null && !lastEntity?.interactionContainer) {
			const interactionContainer = new CSS2DObject(document.createElement('div'))
			ecs.update(lastEntity, { interactionContainer })
			ecs.reindex(lastEntity)
		}
		for (const item of losingInteractionQuery) {
			if (lastEntity !== item) {
				setTimeout(() => ecs.removeComponent(item, 'interactionContainer'), 100)
			}
		}
	}
}
