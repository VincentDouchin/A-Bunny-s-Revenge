import type { items } from '@assets/assets'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { AdditiveBlending, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets, ecs, gameTweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { addTag, inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import { addItemToPlayer } from '@/utils/dialogHelpers'
import { updateSave } from '@/global/save'
import { sleep } from '@/utils/sleep'

export const itemsQuery = ecs.with('item', 'position', 'model').without('collecting')

export const itemBundle = (item: items) => {
	const model = assets.items[item].model.clone()
	model.scale.setScalar(5)
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, true, new Vector3(1, 1, 1))
	bundle.model.castShadow = true
	bundle.model.renderOrder = 2
	const shadow = new Mesh(
		new SphereGeometry(0.3),
		new MeshBasicMaterial({ color: 0x000000, transparent: true, blending: AdditiveBlending, depthWrite: false }),
	)
	shadow.position.y = 0.3
	shadow.castShadow = true
	bundle.model.add(shadow)
	return {
		...bundle,
		item: true,
		...inMap(),
		itemLabel: item,
	} as const satisfies Entity
}
export const bobItems = () => itemsQuery.onEntityAdded.subscribe((entity) => {
	gameTweens.add(new Tween({ rotation: 0 })
		.to({ rotation: Math.PI * 2 }, 2000)
		.repeat(Number.POSITIVE_INFINITY)
		.onUpdate(({ rotation }) => entity.rotation?.setFromAxisAngle(new Vector3(0, 1, 0), rotation)))
	gameTweens.add(new Tween(entity.model.position)
		.to({ y: 5 }, 2000)
		.repeat(Number.POSITIVE_INFINITY).yoyo(true).easing(Easing.Quadratic.InOut))
})

export const popItems = () => ecs.with('body', 'item', 'collider').onEntityAdded.subscribe((e) => {
	const force = e.popDirection ?? new Vector3().randomDirection()
	force.y = 30
	force.x = force.x * 20
	force.z = force.z * 20
	e.body.applyImpulse(force, true)
	playSound(['665181__el_boss__item-or-material-pickup-pop-3-of-3', '665182__el_boss__item-or-material-pickup-pop-2-of-3', '665183__el_boss__item-or-material-pickup-pop-1-of-3'])
})
const itemsToStopQuery = ecs.with('item', 'body', 'position')
export const stopItems = () => {
	for (const item of itemsToStopQuery) {
		if (item.body.translation().y <= (item.groundLevel ?? 0) + 1) {
			if (item.bounce && item.bounce.amount > 0 && !item.bounce.touchedGround) {
				const force = item.bounce.force.clone().multiplyScalar(item.bounce.amount)
				item.body.applyImpulse(force, true)
				item.bounce.amount -= 1
				item.bounce.touchedGround = true
				if (force.y < 1)item.bounce.amount = 0
			} else {
				item.position.y = item.groundLevel ?? 1
				item.body.setBodyType(RigidBodyType.Fixed, true)
			}
		} else if (item.bounce && item.bounce.touchedGround) {
			item.bounce.touchedGround = false
		}
	}
}

const playerQuery = ecs.with('player', 'position', 'inventory', 'inventoryId', 'inventorySize')
export const collectItems = (force = false) => async () => {
	for (const player of playerQuery) {
		for (const item of itemsQuery) {
			const dist = item.position.clone().setY(0).distanceTo(player.position.clone().setY(0))
			if (dist < 10 || force) {
				ecs.removeComponent(item, 'body')
				if (force) await sleep(100)
				itemsQuery.remove(item)
				if (item.itemLabel) {
					addItemToPlayer({ name: item.itemLabel, quantity: 1, recipe: item.recipe, health: item.health })
				}
				if (item.acorn) {
					updateSave(s => s.acorns++)
				}
				addTag(item, 'collecting')
				gameTweens.add(new Tween([0])
					.easing(Easing.Elastic.Out)
					.to([1], dist * 100).onUpdate(([i]) => {
						item.position.lerp({ ...player.position, y: 4 }, i)
					}).onComplete(() => {
						ecs.remove(item)
					}))
				setTimeout(() => playSound('zapsplat_multimedia_alert_action_collect_pick_up_point_or_item_79293'), dist * 100 - 500)
				gameTweens.add(new Tween(item.model.scale).to(new Vector3(), dist * 100).easing(Easing.Bounce.Out))
			}
		}
	}
}