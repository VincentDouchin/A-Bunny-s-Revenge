import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { healthBundle } from './health'
import type { enemy } from '@/constants/enemies'
import { enemyData } from '@/constants/enemies'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { stateBundle } from '@/lib/stateMachine'

export const enemyBundle = (name: enemy) => {
	const enemy = enemyData[name]
	const model = assets.characters[name]
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	return {
		...bundle,
		[enemy.animator]: new Animator(bundle.model, model.animations),
		...healthBundle(enemy.health),
		inMap: true,
		faction: Faction.Enemy,
		movementForce: new Vector3(),
		speed: 100,
		drops: enemy.drops(),
		sensor: true,
		...stateBundle<'dying' | 'idle' | 'running' | 'hit' | 'dead' | 'waitingAttack' | 'attacking' | 'attackCooldown'>('idle', {
			idle: ['running', 'hit', 'waitingAttack'],
			running: ['idle', 'hit', 'waitingAttack'],
			dying: ['dead'],
			hit: ['dying', 'idle'],
			dead: [],
			waitingAttack: ['idle', 'attacking', 'hit'],
			attacking: ['attackCooldown', 'hit'],
			attackCooldown: ['idle', 'hit'],
		}),
	} as const satisfies Entity
}
const entities = ecs.with('faction', 'position', 'rotation', 'body', 'collider', 'movementForce', 'state', 'stateMachine', 'sensorCollider', 'currentHealth')

const enemiesQuery = entities.where(({ faction }) => faction === Faction.Enemy)
const playerQuery = entities.where(({ faction }) => faction === Faction.Player)
export const enemyAttackPlayer = () => {
	for (const enemy of enemiesQuery) {
		switch (enemy.state) {
			case 'attackCooldown':
			case 'idle':
			case 'running':{
				for (const player of playerQuery) {
					const direction = player.position.clone().sub(enemy.position).normalize()
					enemy.movementForce.x = direction.x
					enemy.movementForce.z = direction.z
					if (enemy.state !== 'attackCooldown' && player.position.distanceTo(enemy.position) < 10) {
						enemy.stateMachine.enter('waitingAttack', enemy)
					}
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
			};break
			case 'attacking':{
				for (const player of playerQuery) {
					if (world.intersectionPair(player.collider, enemy.sensorCollider)) {
						player.currentHealth -= 1
						enemy.stateMachine.enter('attackCooldown', enemy)
					}
				}
			}
		}
	}
}