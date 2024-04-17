import { applyMove, applyRotate, getMovementForce, takeDamage } from './behaviorHelpers'
import { playerQuery } from './enemyBehavior'
import { EnemyAttackStyle } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { behaviorPlugin } from '@/lib/behaviors'
import { honeyProjectile, pollenAttack, projectilesCircleAttack } from '@/states/dungeon/attacks'
import { flash } from '@/states/dungeon/battle'
import { getRandom } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'

const rangedAttacks = [pollenAttack, honeyProjectile, projectilesCircleAttack]
const beeBossQuery = ecs
	.with('boss', 'attackStyle', 'movementForce', 'speed', 'position', 'rotation', 'body', 'enemyAnimator', 'group', 'collider', 'currentHealth', 'maxHealth', 'model', 'strength')
	.where(e => e.attackStyle === EnemyAttackStyle.BeeBoss)
export const beeBossBehaviorPlugin = behaviorPlugin(
	beeBossQuery,
	'boss',
	(e) => {
		const player = playerQuery.first
		const direction = player ? player.position.clone().sub(e.position).normalize() : null
		const touchedByPlayer = player && player.state === 'attack' && world.intersectionPair(player.sensorCollider, e.collider)
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
				if (dist > 40) {
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
			await sleep(2000)
			const rangeAttack = getRandom(rangedAttacks)
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
			await sleep(500)
			setState('attack')
		},
		update: (_e, setState, { touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
		},
	},
	attackCooldown: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('running')
			await sleep(2000)
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
			await e.enemyAnimator.playOnce('hit')
			player && takeDamage(e, player.strength.value)
			ecs.update(e, { tween: flash(e, 200, true) })
			setState('idle')
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