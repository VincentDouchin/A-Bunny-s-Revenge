import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { Mesh, Vector3 } from 'three'
import { itemBundle } from '../game/items'
import type { Entity } from '@/global/entity'
import { Faction } from '@/global/entity'
import { ecs, time, world } from '@/global/init'
import { addTweenTo } from '@/lib/updateTween'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { impact } from '@/particles/impact'
import { CharacterMaterial } from '@/shaders/materials'
import { addCameraShake } from '@/global/camera'
import { lootPool } from '@/constants/enemies'

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

const calculateDamage = (entity: With<Entity, 'strength' | 'critChance' | 'critDamage' | 'combo'>) => {
	let damage = entity.strength.value
	if (entity.combo.lastAttack === 1) {
		damage *= 1.2
	}
	if (entity.combo.lastAttack === 2) {
		damage *= 1.5
	}
	const isCrit = Math.random() < entity.critChance.value
	if (isCrit) {
		damage += entity.strength.value * entity.critDamage.value
	}
	return [damage, isCrit] as const
}

const enemiesQuery = entities.with('strength').where(({ faction }) => faction === Faction.Enemy)
const playerQuery = entities.with('playerControls', 'strength', 'body', 'critChance', 'critDamage', 'speed', 'state', 'stateMachine', 'combo', 'playerAnimator', 'weapon', 'lootQuantity', 'lootRarity').where(({ faction }) => faction === Faction.Player)
export const playerAttack = () => {
	for (const player of playerQuery) {
		const { playerControls, sensorCollider, position, state, stateMachine, combo, playerAnimator } = player
		if (['idle', 'running'].includes(state)) {
			if (playerControls.get('primary').pressed) {
				stateMachine.enter('waitingAttack', player)
			}
		}
		if (state === 'waitingAttack') {
			if (playerControls.get('primary').justReleased) {
				if (combo.heavyAttack >= 2000) {
					combo.lastAttack = 2
					combo.heavyAttack = 0
				}
				stateMachine.enter('attacking', player)
			}
			if (playerControls.get('primary').pressed) {
				combo.heavyAttack += time.delta
			}
		}
		if (state === 'attacking') {
			if (playerControls.get('primary').justReleased) {
				if (combo.lastAttack === 0 && playerAnimator.current === 'FIGHT_ACTION1') {
					combo.lastAttack = 1
				} else if (combo.lastAttack === 1 && playerAnimator.current === 'SLASH') {
					combo.lastAttack = 2
				}
			}
			for (const enemy of enemiesQuery) {
				if (world.intersectionPair(sensorCollider, enemy.collider)) {
					if (player.playerAnimator.getTimeRatio() > 0.5) {
						if (enemy.stateMachine.enter('hit', enemy)) {
							// ! damage
							const [damage, crit] = calculateDamage(player)
							enemy.currentHealth -= damage
							const emitter = impact().emitter
							emitter.position.y = 5
							ecs.update(enemy, { emitter })

							spawnDamageNumber(damage, enemy, crit)
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
}
export const spawnDrops = () => ecs.with('drops', 'position').onEntityRemoved.subscribe((e) => {
	const player = playerQuery.first
	if (player) {
		for (const drop of lootPool(player.lootQuantity.value, player.lootRarity.value, e.drops)) {
			ecs.add({ ...itemBundle(drop.name), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})

const takeDamage = (entity: With<Entity, 'currentHealth'>, damageDealer: With<Entity, 'strength'>) => {
	entity.currentHealth = Math.max(0, entity.currentHealth - damageDealer.strength.value)
}

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
						player.stateMachine.enter('hit', player)
						takeDamage(player, enemy)
						addCameraShake()
						ecs.update(player, { tween: flash(player) })
						enemy.stateMachine.enter('attackCooldown', enemy)
					}
				}
			}
		}
	}
}

const projectileQuery = ecs.with('projectile', 'strength', 'collider')

export const projectilesDamagePlayer = () => {
	const player = playerQuery.first
	for (const projectile of projectileQuery) {
		world.intersectionPairsWith(projectile.collider, (c) => {
			if (c === player?.collider) {
				takeDamage(player, projectile)
				addCameraShake()
				ecs.update(player, { tween: flash(player) })
				ecs.remove(projectile)
			}
		})
	}
}

const deathTimedQuery = ecs.with('deathTimer')
export const applyDeathTimer = () => {
	for (const entity of deathTimedQuery) {
		entity.deathTimer -= time.delta
		if (entity.deathTimer <= 0) {
			ecs.remove(entity)
		}
	}
}