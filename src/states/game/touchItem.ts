import type { Entity } from '@/global/entity'
import type { app } from '@/global/states'
import type { Plugin } from '@/lib/app'
import { CSS2DObject } from 'three/addons'
import { Vector3 } from 'three/webgpu'
import { ecs } from '@/global/init'
import { runIf } from '@/lib/app'
import { getIntersections } from './sensor'

const interactableQuery = ecs.with('interactable')
const playerQuery = ecs.with('sensor', 'position', 'rotation')
const interactingQuery = interactableQuery.with('collider', 'position')
const losingInteractionQuery = interactingQuery.with('interactionContainer')
const outlineQuery = ecs.with('outline', 'group')
const touchItem = () => {
	for (const player of playerQuery) {
		let lastDist = Number.POSITIVE_INFINITY
		let lastEntity: Entity | null = null

		for (const item of interactingQuery) {
			if (getIntersections(player, undefined, (c) => c === item.collider)) {
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
				ecs.removeComponent(item, 'outline')
				ecs.removeComponent(item, 'interactionContainer')
			}
		}
	}
}

const removeOutlines = () =>
	outlineQuery.onEntityRemoved.subscribe((e) => {
		e.group.traverse((node) => node.layers.disable(1))
	})

const addOutline = () =>
	outlineQuery.onEntityAdded.subscribe((e) => {
		e.group.traverse((node) => node.layers.enable(1))
	})

const removeInteractionContainer = () =>
	interactableQuery.onEntityRemoved.subscribe((e) => {
		ecs.removeComponent(e, 'outline')
		ecs.removeComponent(e, 'interactionContainer')
	})

export const interactionPlugin: Plugin<typeof app> = (app) => {
	app.onUpdate(
		'game',
		runIf(() => app.isDisabled('paused'), touchItem),
	).addSubscribers('game', removeOutlines, addOutline, removeInteractionContainer)
}
