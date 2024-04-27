import { Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { applyMove, applyRotate, getMovementForce, takeDamage } from './behaviorHelpers'
import { playerQuery } from './enemyBehavior'
import { playSound } from '@/global/sounds'
import { EnemyAttackStyle } from '@/global/entity'
import { ecs, gameTweens, world } from '@/global/init'
import { behaviorPlugin } from '@/lib/behaviors'
import { honeyProjectile, pollenAttack, projectilesCircleAttack } from '@/states/dungeon/attacks'
import { calculateDamage, flash } from '@/states/dungeon/battle'
import { getRandom } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'
import { spawnDamageNumber } from '@/particles/damageNumber'

const pollenQuery = ecs.with('pollen')
const rangedAttacks = () => pollenQuery.size > 5
	? [honeyProjectile, projectilesCircleAttack]
	: [pollenAttack, honeyProjectile, projectilesCircleAttack]
const beeBossQuery = ecs
	.with('boss', 'attackStyle', 'movementForce', 'speed', 'position', 'rotation', 'body', 'enemyAnimator', 'group', 'collider', 'currentHealth', 'maxHealth', 'model', 'strength', 'hitTimer', 'size', 'targetRotation')
	.where(e => e.attackStyle === EnemyAttackStyle.BeeBoss)
export const beeBossBehaviorPlugin = behaviorPlugin(
	beeBossQuery,
	'boss',
	(e) => {
		const player = playerQuery.first
		const direction = player ? player.position.clone().sub(e.position).normalize() : null
		const touchedByPlayer = !e.hitTimer.running() && player && player.state === 'attack' && world.intersectionPair(player.sensorCollider, e.collider)
		return { ...getMovementForce(e), player, direction, touchedByPlayer }
	},
)({
	idle: {
		enter: (e) => {
			e.enemyAnimator.playAnimation('idle')
		},
		update: (e, setState, { player, touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
			if (player) {
				const dist = player.position.distanceTo(e.position)
				if (dist > 40 || Math.random() > 0.5) {
					setState('rangeAttack')
				} else {
					setState('running')
				}
			}
		},
	},
	running: {
		enter: (e) => {
			e.enemyAnimator.playAnimation('running')
		},
		update: (e, setState, { direction, force, player, touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
			if (direction) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
			}
			applyRotate(e, force)
			applyMove(e, force)
			if (player) {
				const dist = player.position.distanceTo(e.position)
				if (dist < 15) {
					setState('waitingAttack')
				}
			}
		},
	},
	attack: {
		enter: async (e, setState) => {
			await e.enemyAnimator.playClamped('attacking')
			return setState('attackCooldown')
		},
		update: (_e, setState, { touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
		},
	},
	rangeAttack: {
		enter: async (e, setState) => {
			flash(e, 1000, 'preparing')
			await sleep(1000)
			const rangeAttack = getRandom(rangedAttacks())
			rangeAttack(e)

			return setState('attackCooldown')
		},
		update: (e, setState, { direction, force, touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
			if (direction) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
			}
			applyRotate(e, force)
		},
	},
	waitingAttack: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('idle')
			flash(e, 200, 'preparing')
			await sleep(200)
			setState('attack')
		},
		update: (_e, setState, { touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
		},
	},
	attackCooldown: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('running')
			await sleep(1000)
			setState('idle')
		},
		update: (e, setState, { direction, force, touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
			if (direction) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
			}
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(0.5))
		},
	},
	hit: {
		enter: async (e, setState, { player }) => {
			playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])
			if (player) {
				const [damage, crit] = calculateDamage(player)
				takeDamage(e, damage)
				spawnDamageNumber(damage, e, crit)
			}
			gameTweens.add(new Tween(e.group.scale).to(new Vector3(0.8, 1.2, 0.8), 200).repeat(1).yoyo(true))
			flash(e, 200, 'damage')
			await e.enemyAnimator.playOnce('hit')
			if (e.currentHealth <= 0) {
				return setState('dying')
			} else {
				return setState('idle')
			}
		},
		exit: (e) => {
			e.hitTimer.reset()
		},
	},
	dying: {
		enter: async (e, setState) => {
			await e.enemyAnimator.playClamped('dead')
			return setState('dead')
		},
	},
	dead: {},
})