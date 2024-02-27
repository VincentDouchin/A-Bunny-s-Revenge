import type { items } from '@assets/assets'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { AdditiveBlending, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { addItem } from '@/global/save'
import { modelColliderBundle } from '@/lib/models'
import { addTweenTo } from '@/lib/updateTween'

const itemsQuery = ecs.with('item', 'position', 'model', 'collider', 'itemLabel')

export const itemBundle = (item: items) => {
	const model = assets.items[item].model.clone()
	model.scale.setScalar(5)
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, true)
	bundle.model.castShadow = true
	bundle.colliderDesc.setMass(8)
	bundle.model.renderOrder = 2
	const shadow = new Mesh(
		new SphereGeometry(1),
		new MeshBasicMaterial({ color: 0x000000, transparent: true, blending: AdditiveBlending, depthWrite: false }),
	)
	shadow.position.y = 5
	shadow.castShadow = true
	bundle.model.add(shadow)
	return {
		...bundle,
		model,
		item: true,
		inMap: true,
		itemLabel: item,
	} as const satisfies Entity
}
export const bobItems = () => itemsQuery.onEntityAdded.subscribe((entity) => {
	addTweenTo(entity)(
		new Tween({ rotation: 0 })
			.to({ rotation: Math.PI * 2 }, 2000)
			.repeat(Number.POSITIVE_INFINITY)
			.onUpdate(({ rotation }) => entity.rotation?.setFromAxisAngle(new Vector3(0, 1, 0), rotation)),
		new Tween(entity.model.position)
			.to({ y: 5 }, 2000)
			.repeat(Number.POSITIVE_INFINITY).yoyo(true).easing(Easing.Quadratic.InOut),
	)
})

const playerQuery = ecs.with('playerControls', 'collider', 'position', 'inventoryId', 'inventorySize', 'inventory')
export const collectItems = () => {
	for (const player of playerQuery) {
		for (const item of itemsQuery) {
			if (world.intersectionPair(player.collider, item.collider)) {
				ecs.removeComponent(item, 'tween')
				ecs.removeComponent(item, 'collider')
				addItem(player, { name: item.itemLabel, quantity: 1 })
				ecs.add({
					parent: item,
					tween: new Tween(item.position).to({ ...player.position, y: item.position.y }, 500).onComplete(() => {
						ecs.remove(item)
					}).easing(Easing.Cubic.Out),
				})
				ecs.add({
					parent: item,
					tween:	new Tween(item.model.scale).to(new Vector3(), 500).easing(Easing.Cubic.Out),
				})
			}
		}
	}
}

export const popItems = () => ecs.with('body', 'item', 'collider').onEntityAdded.subscribe((e) => {
	const force = e.popDirection ?? new Vector3().randomDirection()
	force.y = 300
	force.x = force.x * 100
	force.z = force.z * 100
	e.body.setLinearDamping(1)
	e.body.setAdditionalMass(2, true)
	e.body.applyImpulse(force, true)
})
const itemsToStopQuery = ecs.with('item', 'body', 'position')
export const stopItems = () => {
	for (const item of itemsToStopQuery) {
		if (item.position.y <= 0) {
			item.body.setBodyType(RigidBodyType.Fixed, true)
		}
	}
}