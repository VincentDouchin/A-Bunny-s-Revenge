import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { healthBundle } from './health'
import { enemies } from '@/constants/enemies'
import { Sizes } from '@/constants/sizes'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { Animator } from '@/global/animator'

export const enemyBundle = (name: keyof typeof enemies) => {
	const model = assets.characters[name]
	const enemy = enemies[name]
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	return {
		...bundle,
		animator: new Animator('Flying_Idle', bundle.model, model.animations),
		...healthBundle(enemy.health),
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
		const avoidOtherEnemies = new Vector3()
		let closeEnemies = 0
		for (const otherEnemy of enemiesQuery) {
			if (otherEnemy !== enemy) {
				const dist = enemy.position.distanceTo(otherEnemy.position)
				if (dist < 50) {
					avoidOtherEnemies.add(enemy.position.clone().sub(otherEnemy.position).normalize().multiplyScalar(20 / dist))
					closeEnemies++
				}
			}
		}
		if (closeEnemies > 0) {
			enemy.movementForce.add(avoidOtherEnemies.divideScalar(closeEnemies || 1))
		}
		enemy.movementForce.normalize()
	}
}