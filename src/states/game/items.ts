import type { items } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import type { Object3D, Object3DEventMap } from 'three'
import { AdditiveBlending, CanvasTexture, Mesh, MeshBasicMaterial, NearestFilter, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { addItem } from '@/global/save'
import { TweenGroup } from '@/lib/tweenGroup'
import { modelColliderBundle } from '@/lib/models'

const itemsQuery = ecs.with('item', 'position', 'model', 'collider', 'itemLabel')

export const itemBundle = (item: items, model?: Object3D<Object3DEventMap>) => {
	const bundle = model
		? modelColliderBundle(model, RigidBodyType.Dynamic, true)
		: {
				bodyDesc: RigidBodyDesc.dynamic().lockRotations().setCcdEnabled(true),
				colliderDesc: ColliderDesc.cuboid(1, 1, 1).setSensor(true),
				size: new Vector3(1, 1, 1),
			}
	bundle.colliderDesc.setMass(8)
	if (!model) {
		const map = new CanvasTexture(assets.items[item])
		map.minFilter = NearestFilter
		map.magFilter = NearestFilter
		model = new Sprite(new SpriteMaterial({ map, depthWrite: false }))
		model.scale.setScalar(5)
		model.position.setY(2.5)
		const shadow = new Mesh(
			new SphereGeometry(0.3),
			new MeshBasicMaterial({ color: 0x000000, transparent: true, blending: AdditiveBlending, depthWrite: false }),
		)
		shadow.castShadow = true
		model.add(shadow)
	}

	return {
		...bundle,
		model,
		item: true,
		itemLabel: item,
	} as const satisfies Entity
}
export const bobItems = () => itemsQuery.onEntityAdded.subscribe((entity) => {
	const tween	= new Tween(entity.model.position).to({ y: 5 }, 2000).repeat(Number.POSITIVE_INFINITY).yoyo(true).easing(Easing.Quadratic.InOut)
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

export const popItems = () => ecs.with('body', 'item', 'collider').onEntityAdded.subscribe((e) => {
	const force = e.popDirection ?? new Vector3().randomDirection()
	force.y = 300
	force.x = force.x * 100
	force.z = force.z * 100
	world.createCollider(ColliderDesc.ball(0.01).setTranslation(0, e.size ? -e.size.y : 1, 0), e.body)
	e.body.setLinearDamping(1)
	e.body.setAdditionalMass(2, true)
	e.body.applyImpulse(force, true)
})