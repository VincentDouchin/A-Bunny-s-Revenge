import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { inventoryBundle } from './inventory'
import { assets, ecs } from '@/global/init'
import { Animator } from '@/global/animator'
import { stateBundle } from '@/lib/stateMachine'
import { modelColliderBundle } from '@/lib/models'

const playerQuery = ecs.with('player', 'position', 'rotation')
export const spawnBasket = () => {
	const model = clone(assets.characters.Basket.scene)
	model.scale.setScalar(5)
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, false)
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
			...bundle,
			basket: true,
			speed: 100,
			...inventoryBundle(24, 'player'),
		})
	}
}

const basketQuery = ecs.with('basket', 'movementForce', 'position')

const itemsQuery = ecs.with('item', 'position')
export const basketFollowPlayer = () => {
	for (const basket of basketQuery) {
		const player = playerQuery.first
		if (player) {
			basket.movementForce.setScalar(0)

			if (itemsQuery.size) {
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
			} else if (player.position.distanceTo(basket.position) > 20) {
				basket.movementForce.add(player.position.clone().sub(basket.position).normalize())
			}
		}
	}
}