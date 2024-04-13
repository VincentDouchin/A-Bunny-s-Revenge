import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { inventoryBundle } from './inventory'
import { Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'

const playerQuery = ecs.with('player', 'position', 'rotation', 'inventory', 'inventoryId', 'inventorySize')
export const spawnBasket = () => {
	const model = clone(assets.characters.Basket.scene)
	model.scale.setScalar(5)
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, false)
	bundle.bodyDesc.setLinearDamping(20)
	const player = playerQuery.first
	if (player) {
		const position = player.position.clone().add(new Vector3(0, 5, -10).applyQuaternion(player.rotation))
		return ecs.add({
			position,
			...inMap(),
			// basketAnimator: new Animator(bundle.model, assets.characters.Basket.animations),
			movementForce: new Vector3(),
			following: false,
			followTarget: player,
			...bundle,
			basket: player,
			speed: 100,
		})
	}
}
const basketQuery = ecs.with('basket', 'movementForce', 'position', 'collider', 'state')
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

export const basketFollowPlayer = (min = 20, max = 40) => () => {
	for (const basket of followQuery) {
		const player = basket.followTarget
		if (player) {
			basket.movementForce.setScalar(0)
			const dist = player.position.distanceTo(basket.position)
			if (basket.following && dist < min) {
				basket.following = false
			}
			if (!basket.following && dist > max) {
				basket.following = true
			}
			if (basket.following) {
				basket.movementForce.add(player.position.clone().sub(basket.position).normalize())
			}
		}
	}
}
