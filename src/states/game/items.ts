import { Easing, Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { ecs, world } from '@/global/init'
import { TweenGroup } from '@/lib/tweenGroup'
import { addItem } from '@/global/save'

const itemsQuery = ecs.with('item', 'rotation', 'position', 'model', 'collider', 'itemLabel')
export const bobItems = () => itemsQuery.onEntityAdded.subscribe((entity) => {
	const tween	= new Tween(entity.model.position).to({ y: 2 }, 2000).repeat(Number.POSITIVE_INFINITY).yoyo(true).easing(Easing.Quadratic.InOut)

	ecs.update(entity, { tween })
})

const playerQuery = ecs.with('playerControls', 'collider', 'position')
export const collectItems = () => {
	for (const player of playerQuery) {
		for (const item of itemsQuery) {
			if (world.intersectionPair(player.collider, item.collider)) {
				ecs.removeComponent(item, 'tween')
				ecs.removeComponent(item, 'collider')
				addItem({ name: item.itemLabel, quantity: 1 })
				const tween = new TweenGroup([
					new Tween(item.position).to({ ...player.position, y: item.position.y }, 500).onComplete(() => {
						ecs.remove(item)
					}).easing(Easing.Cubic.Out),
					new Tween(item.model.scale).to(new Vector3(), 500).easing(Easing.Cubic.Out),
				])
				ecs.addComponent(item, 'tween', tween)
			}
		}
	}
}