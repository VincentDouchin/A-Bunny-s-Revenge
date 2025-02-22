import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import { States, states } from '@/global/entity'
import { ecs } from '@/global/init'
import { action, condition, createBehaviorTree, enteringState, inState, selector, sequence, setState, waitFor, withContext } from '@/lib/behaviors'
import { honeyProjectile, pollenAttack, projectilesCircleAttack } from '@/states/dungeon/attacks'
import { getRandom } from '@/utils/mapFunctions'
import { between } from 'randomish'
import { applyMove, applyRotate } from './behaviorHelpers'
import { attackCooldownNode, damagedByPlayer, deadNode, enemyContext, hitNode, idleNode, runningNode, waitingAttackNode } from './commonBehaviors'
import { baseEnemyQuery } from './enemyBehavior'

const pollenQuery = ecs.with('pollen')

const rangedAttacks = (e: With<Entity, 'group' | 'rotation' | 'strength'>) => getRandom(pollenQuery.size > 5
	? [honeyProjectile, projectilesCircleAttack]
	: [pollenAttack, honeyProjectile, projectilesCircleAttack])(e)

export const beeBossBehavior = createBehaviorTree(
	baseEnemyQuery.with('boss', 'enemyAnimator', 'beeBoss', ...states(States.beeBoos)),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			selector(
				damagedByPlayer(),
				sequence(
					enteringState('rangeAttack'),
					action(rangedAttacks),
				),

				sequence(
					enteringState('attack'),
					action((_e, _c, a) => a.playOnce('attacking')),
					selector(
						sequence(
							condition((e, c) => c.player && c.player.position.distanceTo(e.position) > 20),
							setState('rangeAttack'),
						),
					),
				),
				sequence(
					inState('attack', 'rangeAttack'),
					applyRotate((_e, c) => c.force),
					applyMove((_e, c) => c.force.clone().multiplyScalar(0)),
					waitFor((_e, _c, a) => !a.isPlaying('attacking')),
					setState('attackCooldown'),
				),
				hitNode(),
				idleNode(),
				runningNode(),
				waitingAttackNode(300)(),
				attackCooldownNode(between(1_000, 3_000), 0.8)(),
				deadNode(),

			),
		),
	),
)

// export const beeBossBehaviorPlugin = behaviorPlugin(
// 	beeBossQuery,
// 	'beeBoss',
// 	(e) => {
// 		const player = playerQuery.first
// 		const direction = player ? player.position.clone().sub(e.position).normalize() : null
// 		const touchedByPlayer = !e.hitTimer.running() && player && player.state === 'attack' && getIntersections(player, undefined, c => c === e.collider)
// 		return { ...getMovementForce(e), player, direction, touchedByPlayer }
// 	},
// )({
// 	idle: {
// 		enter: (e) => {
// 			e.enemyAnimator.playAnimation('idle')
// 		},
// 		update: (e, setState, { player, touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 			if (player) {
// 				const dist = player.position.distanceTo(e.position)
// 				if (dist > 40 || Math.random() > 0.5) {
// 					setState('rangeAttack')
// 				} else {
// 					setState('running')
// 				}
// 			}
// 		},
// 	},
// 	running: {
// 		enter: (e) => {
// 			e.enemyAnimator.playAnimation('running')
// 		},
// 		update: (e, setState, { direction, force, player, touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 			if (direction) {
// 				e.movementForce.x = direction.x
// 				e.movementForce.z = direction.z
// 			}
// 			applyRotate(e, force)
// 			applyMove(e, force)
// 			if (player) {
// 				const dist = player.position.distanceTo(e.position)
// 				if (dist < 15) {
// 					setState('waitingAttack')
// 				}
// 			}
// 		},
// 	},
// 	attack: {
// 		enter: async (e, setState) => {
// 			await e.enemyAnimator.playClamped('attacking')
// 			return setState('attackCooldown')
// 		},
// 		update: (_e, setState, { touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 		},
// 	},
// 	rangeAttack: {
// 		enter: async (e, setState) => {
// 			flash(e, 1000, 'preparing')
// 			await sleep(1000)
// 			const rangeAttack = getRandom(rangedAttacks())
// 			rangeAttack(e)

// 			return setState('attackCooldown')
// 		},
// 		update: (e, setState, { direction, force, touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 			if (direction) {
// 				e.movementForce.x = direction.x
// 				e.movementForce.z = direction.z
// 			}
// 			applyRotate(e, force)
// 		},
// 	},
// 	waitingAttack: {
// 		enter: async (e, setState) => {
// 			e.enemyAnimator.playAnimation('idle')
// 			flash(e, 200, 'preparing')
// 			await sleep(200)
// 			setState('attack')
// 		},
// 		update: (_e, setState, { touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 		},
// 	},
// 	attackCooldown: {
// 		enter: async (e, setState) => {
// 			e.enemyAnimator.playAnimation('running')
// 			await sleep(1000)
// 			setState('idle')
// 		},
// 		update: (e, setState, { direction, force, touchedByPlayer }) => {
// 			if (touchedByPlayer) return setState('hit')
// 			if (direction) {
// 				e.movementForce.x = direction.x
// 				e.movementForce.z = direction.z
// 			}
// 			applyRotate(e, force)
// 			applyMove(e, force.multiplyScalar(0.5))
// 		},
// 	},
// 	hit: {
// 		enter: async (e, setState, { player }) => {
// 			playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])
// 			if (player) {
// 				const [damage, crit] = calculateDamage(player)
// 				takeDamage(e, damage)
// 				spawnDamageNumber(damage, e, crit)
// 			}
// 			tweens.add({
// 				from: e.group.scale.clone(),
// 				to: new Vector3(0.8, 1.2, 0.8),
// 				duration: 200,
// 				repeat: 1,
// 				repeatType: 'mirror',
// 				onUpdate: f => e.group.scale.copy(f),
// 			})
// 			flash(e, 200, 'damage')
// 			await e.enemyAnimator.playOnce('hit')
// 			if (e.currentHealth <= 0) {
// 				return setState('dying')
// 			} else {
// 				return setState('idle')
// 			}
// 		},
// 		exit: (e) => {
// 			e.hitTimer.reset()
// 		},
// 	},
// 	dying: {
// 		enter: async (e, setState) => {
// 			await e.enemyAnimator.playClamped('dead')
// 			return setState('dead')
// 		},
// 	},
// 	dead: {},
// })