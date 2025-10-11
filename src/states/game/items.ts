import type { AssetNames, Entity } from '@/global/entity'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { createBackIn, easeInOut, linear } from 'popmotion'
import { AdditiveBlending, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { assets, ecs, save, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { modelColliderBundle } from '@/lib/colliders'
import { addTag, inMap } from '@/lib/hierarchy'
import { addItemToPlayer } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'

export const itemsQuery = ecs.with('item', 'position', 'model').without('collecting')

export const itemBundle = (item: AssetNames['items']) => {
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
	tweens.add({
		parent: entity,
		duration: 2000,
		from: 0,
		to: Math.PI * 2,
		repeat: Number.POSITIVE_INFINITY,
		onUpdate: (f) => {
			entity.rotation?.setFromAxisAngle(new Vector3(0, 1, 0), f)
		},
		ease: linear,
	})
	tweens.add({
		parent: entity,
		duration: 2000,
		from: entity.model.position.y,
		to: entity.model.position.y + 5,
		repeat: Number.POSITIVE_INFINITY,
		onUpdate: f => entity.model.position.y = f,
		ease: easeInOut,
		repeatType: 'mirror',
	})
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
				item.body.setBodyType(RigidBodyType.Fixed, false)
			}
		} else if (item.bounce && item.bounce.touchedGround) {
			item.bounce.touchedGround = false
		}
	}
}

const playerQuery = ecs.with('player', 'position', 'inventory', 'inventoryId', 'inventorySize')
export const collectItems = (force: boolean) => async () => {
	for (const player of playerQuery) {
		for (const item of itemsQuery) {
			if (item) {
				const dist = item.position.clone().setY(0).distanceTo(player.position.clone().setY(0))
				if (dist < 10 || force) {
					ecs.removeComponent(item, 'body')
					itemsQuery.remove(item)
					if (force) await sleep(100)

					addTag(item, 'collecting')
					const initialPosition = item.position.clone()
					const initialScale = item.model.scale.clone()
					tweens.add({
						destroy: item,
						from: 0,
						to: 1,
						ease: createBackIn(3),
						duration: dist * 30,
						onUpdate: (f) => {
							item.position.lerpVectors(initialPosition, { ...player.position, y: 4 }, f)
							item.model.scale.lerpVectors(initialScale, initialScale.clone().multiplyScalar(0.5), f)
						},
						onComplete: () => {
							playSound('zapsplat_multimedia_alert_action_collect_pick_up_point_or_item_79293')
							if (item.itemLabel) {
								addItemToPlayer({ name: item.itemLabel, quantity: 1, recipe: item.recipe, health: item.health })
							}
							if (item.acorn) {
								save.acorns++
							}
						},
					})
				}
			}
		}
	}
}