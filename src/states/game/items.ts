import type { items } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { AdditiveBlending, CanvasTexture, Mesh, MeshBasicMaterial, NearestFilter, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { addItem } from '@/global/save'
import { TweenGroup } from '@/lib/tweenGroup'

const itemsQuery = ecs.with('item', 'position', 'model', 'collider', 'itemLabel')

export const itemBundle = (item: items) => {
	const map = new CanvasTexture(assets.items[item])
	map.minFilter = NearestFilter
	map.magFilter = NearestFilter
	const sprite = new Sprite(new SpriteMaterial({ map }))
	sprite.scale.setScalar(5)
	sprite.position.setY(2.5)
	const shadow = new Mesh(new SphereGeometry(0.3), new MeshBasicMaterial({
		color: 0x000000,
		transparent: true,
		blending: AdditiveBlending,
	}))
	shadow.castShadow = true
	sprite.add(shadow)
	return {
		bodyDesc: RigidBodyDesc.fixed(),
		colliderDesc: ColliderDesc.cuboid(5, 5, 5).setSensor(true),
		model: sprite,
		item: true,
		itemLabel: item,
	} as const satisfies Entity
}
export const bobItems = () => itemsQuery.onEntityAdded.subscribe((entity) => {
	const tween	= new Tween(entity.model.position).to({ y: 2 }, 2000).repeat(Number.POSITIVE_INFINITY).yoyo(true).easing(Easing.Quadratic.InOut)

	ecs.update(entity, { tween })
})

const playerQuery = ecs.with('playerControls', 'collider', 'position', 'inventoryId', 'inventorySize', 'inventory')
export const collectItems = () => {
	for (const player of playerQuery) {
		for (const item of itemsQuery) {
			if (world.intersectionPair(player.collider, item.collider)) {
				ecs.removeComponent(item, 'tween')
				ecs.removeComponent(item, 'collider')
				addItem(player, { name: item.itemLabel, quantity: 1 })
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