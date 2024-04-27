import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { inventoryBundle } from './inventory'
import { Animator } from '@/global/animator'
import { Interactable, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { behaviorBundle } from '@/lib/behaviors'
import { inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import { Stat } from '@/lib/stats'

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
			basketAnimator: new Animator(bundle.model, assets.characters.Basket.animations),
			movementForce: new Vector3(),
			targetRotation: new Quaternion(),
			...bundle,
			basket: player,
			speed: new Stat(100),
			...behaviorBundle('basket', 'idle'),
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
