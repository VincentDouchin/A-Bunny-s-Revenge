import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ecs, world } from '@/global/init'

const playerQuery = ecs.with('playerControls', 'sensorCollider')
const items = ecs.with('collider', 'interactable')
const interactingQuery = items.without('interactionContainer')
const losingInteractionQuery = items.with('interactionContainer')

export const touchItem = () => {
	for (const player of playerQuery) {
		for (const item of interactingQuery) {
			if (world.intersectionPair(player.sensorCollider, item.collider)) {
				// addTag(item, 'interacting')
				// if (item.model) {
				// 	const outline = item.model.clone()
				// 	const tweenGroup = new TweenGroup()
				// 	outline.traverse((node) => {
				// 		if (node instanceof Mesh) {
				// 			node.material = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 })
				// 			tweenGroup.add(new Tween(node.material).to({ opacity: 0.5 }, 200))
				// 		}
				// 	})

				// 	const outlineEntity = ecs.add({ model: outline, parent: item, position: new Vector3(), tween: tweenGroup })
				// 	ecs.update(item, { outline: outlineEntity })
				// }
				const interactionContainer = new CSS2DObject(document.createElement('div'))
				ecs.update(item, { interactionContainer })
			}
		}
		for (const item of losingInteractionQuery) {
			if (!world.intersectionPair(player.sensorCollider, item.collider)) {
				// ecs.removeComponent(item, 'interacting')
				ecs.removeComponent(item, 'interactionContainer')
			}
		}
	}
}

export const showInteraction = [
	// () => losingInteractionQuery.onEntityAdded.subscribe((entity) => {
	// 	const interactionContainer = new CSS2DObject(document.createElement('div'))
	// 	ecs.update(entity, { interactionContainer })
	// }),
	// () => losingInteractionQuery.onEntityRemoved.subscribe((entity) => {
	// 	ecs.removeComponent(entity, 'interactionContainer')
	// }),
]