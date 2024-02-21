import { Tween } from '@tweenjs/tween.js'
import { Mesh, Vector3 } from 'three'
import type { With } from 'miniplex'
import { itemBundle } from '../game/items'
import type { Entity } from '@/global/entity'
import { Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { impact } from '@/particles/impact'
import { CharacterMaterial } from '@/shaders/GroundShader'
import { addTweenTo } from '@/lib/updateTween'

export const flash = (entity: With<Entity, 'model'>) => {
	const tween = new Tween({ color: 0 })
		.to({ color: 1 }, 200)
		.yoyo(true)
		.repeat(1)
		.onComplete(() => ecs.removeComponent(entity, 'tween'))
	tween.onUpdate(({ color }) => {
		entity.model.traverse((node) => {
			if (node instanceof Mesh && node.material instanceof CharacterMaterial) {
				node.material.uniforms.flash.value = color
			}
		})
	})
	return tween
}
const entities = ecs.with('faction', 'position', 'rotation', 'body', 'collider', 'movementForce', 'state', 'stateMachine', 'sensorCollider', 'currentHealth', 'model', 'size', 'group')

const enemiesQuery = entities.where(({ faction }) => faction === Faction.Enemy)
const playerQuery = entities.with('playerControls', 'strength').where(({ faction }) => faction === Faction.Player)
export const playerAttack = () => {
	for (const { playerControls, sensorCollider, position, strength } of playerQuery) {
		if (playerControls.get('primary').justPressed) {
			for (const enemy of enemiesQuery) {
				if (world.intersectionPair(sensorCollider, enemy.collider)) {
					if (enemy.stateMachine.enter('hit', enemy)) {
						// ! damage
						enemy.currentHealth -= strength.value
						const emitter = impact().emitter
						emitter.position.y = 5
						ecs.update(enemy, { emitter })

						spawnDamageNumber(strength.value, enemy)
						// ! knockback
						const force = position.clone().sub(enemy.position).normalize().multiplyScalar(-50000)
						enemy.body.applyImpulse(force, true)
						// ! damage flash
						addTweenTo(enemy)(new Tween(enemy.group.scale).to(new Vector3(0.8, 1.2, 0.8), 200).repeat(1).yoyo(true), flash(enemy))
					}
				}
			}
		}
	}
}
export const spawnDrops = () => ecs.with('drops', 'position').onEntityRemoved.subscribe((e) => {
	for (const drop of e.drops) {
		for (let i = 0; i < drop.quantity; i++) {
			ecs.add({ ...itemBundle(drop.name), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})

export const enemyAttackPlayer = () => {
	for (const enemy of enemiesQuery) {
		switch (enemy.state) {
			case 'attackCooldown':
			case 'idle':
			case 'running': {
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
			}; break
			case 'attacking': {
				for (const player of playerQuery) {
					if (world.intersectionPair(player.collider, enemy.sensorCollider)) {
						player.currentHealth -= 1
						player.stateMachine.enter('hit', player)
						ecs.update(player, { tween: flash(player) })
						enemy.stateMachine.enter('attackCooldown', enemy)
					}
				}
			}
		}
	}
}