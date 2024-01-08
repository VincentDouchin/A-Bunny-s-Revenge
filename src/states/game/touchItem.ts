import { Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { Tween } from '@tweenjs/tween.js'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ecs, world } from '@/global/init'
import { TweenGroup } from '@/lib/tweenGroup'

const playerQuery = ecs.with('playerControls', 'sensorCollider')
const items = ecs.with('collider', 'interactable', 'model', 'group')
const itemsToOutline = items.without('outline')
const itemsToUnOuline = items.with('outline')

export const touchItem = () => {
	for (const player of playerQuery) {
		for (const item of itemsToOutline) {
			if (world.intersectionPair(player.sensorCollider, item.collider)) {
				const outline = item.model.clone()
				const tweenGroup = new TweenGroup()
				outline.traverse((node) => {
					if (node instanceof Mesh) {
						node.material = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 })
						tweenGroup.add(new Tween(node.material).to({ opacity: 0.5 }, 200))
					}
				})

				item.group.add(outline)
				const outlineEntity = ecs.add({ model: outline, parent: item, position: new Vector3(), tween: tweenGroup })
				const interactionContainer = new CSS2DObject(document.createElement('div'))
				ecs.update(item, { outline: outlineEntity, interactionContainer })
			}
		}
		for (const item of itemsToUnOuline) {
			if (!world.intersectionPair(player.sensorCollider, item.collider)) {
				ecs.remove(item.outline)
				ecs.removeComponent(item, 'outline')
				ecs.removeComponent(item, 'interactionContainer')
			}
		}
	}
}