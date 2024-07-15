import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { getIntersections } from './sensor'
import { ecs } from '@/global/init'
import type { Entity } from '@/global/entity'
import type { State } from '@/lib/state'

const interactableQuery = ecs.with('interactable')
const playerQuery = ecs.with('playerControls', 'sensor', 'position', 'rotation')
const interactingQuery = interactableQuery.with('collider', 'position')
const losingInteractionQuery = interactingQuery.with('interactionContainer')
const outlineQuery = ecs.with('outline')
const touchItem = () => {
	for (const player of playerQuery) {
		let lastDist = Number.POSITIVE_INFINITY
		let lastEntity: Entity | null = null

		for (const item of interactingQuery) {
			if (getIntersections(player, undefined, c => c === item.collider)) {
				const sensorPos = new Vector3(0, 0, player.sensor.distance).applyQuaternion(player.rotation).add(player.position)
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

const removeOutlines = () => outlineQuery.onEntityRemoved.subscribe((e) => {
	e.model?.traverse(node => node.layers.disable(1))
})

const addOutline = () => outlineQuery.onEntityAdded.subscribe((e) => {
	e.model?.traverse(node => node.layers.enable(1))
})

const removeInteractionContainer = () => interactingQuery.onEntityRemoved.subscribe((e) => {
	ecs.removeComponent(e, 'interactionContainer')
	ecs.removeComponent(e, 'outline')
})

export const interactionPlugin = (state: State) => {
	state
		.onUpdate(touchItem)
		.addSubscriber(removeOutlines, addOutline, removeInteractionContainer)
}