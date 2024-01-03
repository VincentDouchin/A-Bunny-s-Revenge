import { RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Vector3 } from 'three'
import { healthBundle } from './health'
import { Sizes } from '@/constants/sizes'
import { type Entity, Faction } from '@/global/entity'
import { ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'

export const enemyBundle = (model: Object3D<Object3DEventMap>, health: number) => {
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, false, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	return {
		...bundle,
		...healthBundle(health),
		inMap: true,
		faction: Faction.Enemy,
		movementForce: new Vector3(),
		speed: 100,
	} as const satisfies Entity
}
const entities = ecs.with('faction', 'position', 'rotation', 'body', 'collider', 'movementForce')
const enemiesQuery = entities.where(({ faction }) => faction === Faction.Enemy)
const playerQuery = entities.where(({ faction }) => faction === Faction.Player)
export const enemyAttackPlayer = () => {
	for (const enemy of enemiesQuery) {
		for (const player of playerQuery) {
			const direction = player.position.clone().sub(enemy.position).normalize()
			enemy.movementForce.x = direction.x
			enemy.movementForce.z = direction.z
		}
	}
}