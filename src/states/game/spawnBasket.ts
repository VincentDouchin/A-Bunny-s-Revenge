import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { inventoryBundle } from './inventory'
import { assets, ecs } from '@/global/init'
import { Animator } from '@/global/animator'
import { stateBundle } from '@/lib/stateMachine'
import { characterControllerBundle, modelColliderBundle } from '@/lib/models'
import { Interactable, MenuType } from '@/global/entity'

const playerQuery = ecs.with('player', 'position', 'rotation', 'inventory', 'inventoryId', 'inventorySize')
export const spawnBasket = () => {
	const model = clone(assets.characters.Basket.scene)
	model.scale.setScalar(5)
	const bundle = modelColliderBundle(model, RigidBodyType.KinematicPositionBased, false)
	bundle.bodyDesc.setLinearDamping(20)
	const player = playerQuery.first
	if (player) {
		const position = player.position.clone().add(new Vector3(0, 0, -10).applyQuaternion(player.rotation))
		ecs.add({
			position,
			inMap: true,
			basketAnimator: new Animator(bundle.model, assets.characters.Basket.animations),
			...stateBundle<'idle' | 'running' | 'picking'>('idle', {
				idle: ['running', 'picking'],
				running: ['idle', 'picking'],
				picking: ['idle'],
			}),
			movementForce: new Vector3(),
			following: false,
			followTarget: player,
			...bundle,
			...characterControllerBundle(),
			basket: player,
			speed: 20,
		})
	}
}
const basketQuery = ecs.with('basket', 'movementForce', 'position')
export const enableBasketUi = () => {
	for (const basket of basketQuery) {
		ecs.update(basket, {
			...inventoryBundle(3, 'basket', Interactable.Open),
			onPrimary(entity) {
				ecs.update(entity, { menuType: MenuType.Basket })
			},
		})
	}
}

const followQuery = ecs.with('followTarget', 'following', 'position', 'movementForce')
const itemsQuery = ecs.with('item', 'position')
export const basketFollowPlayer = () => {
	for (const basket of followQuery) {
		const player = basket.followTarget
		if (player) {
			basket.movementForce.setScalar(0)
			const dist = player.position.distanceTo(basket.position)
			if (basket.basket && itemsQuery.size) {
				let closestItem = itemsQuery.first
				let distance = Number.POSITIVE_INFINITY
				for (const item of itemsQuery) {
					const itemDistance = item.position.distanceTo(basket.position)
					if (itemDistance < distance) {
						distance = itemDistance
						closestItem = item
					}
				}
				if (closestItem) {
					basket.movementForce.add(closestItem.position.clone().sub(basket.position).normalize())
				}
			}
			if (basket.following && dist < 20) {
				basket.following = false
			}
			if (!basket.following && dist > 40) {
				basket.following = true
			}
			if (basket.following) {
				basket.movementForce.add(player.position.clone().sub(basket.position).normalize())
			}
		}
	}
}