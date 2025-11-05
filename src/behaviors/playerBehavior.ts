import type { With } from 'miniplex'
import type { Entity, QueryEntity } from '@/global/entity'
import { Vector3 } from 'three'
import { addCameraShake } from '@/global/camera'
import { Faction } from '@/global/entity'
import { gameOverEvent } from '@/global/events'
import { ecs, gameInputs, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { inMap } from '@/lib/hierarchy'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { poisonBubbles } from '@/states/dungeon/poisonTrail'
import { stunBundle } from '@/states/dungeon/stun'
import { getIntersections } from '@/states/game/sensor'
import { action, condition, createBehaviorTree, enteringState, ifElse, inState, inverter, parallel, selector, sequence, setState, wait, waitFor } from '../lib/behaviors'
import { flash } from '../states/dungeon/battle'
import { applyMove, applyRotate, getMovementForce, getPlayerRotation, getRelativeDirection, takeDamage } from './behaviorHelpers'
import { withContext } from './commonBehaviors'

const ANIMATION_SPEED = 1.3
const playerQuery = ecs.with('playerAnimator', 'movementForce', 'speed', 'body', 'rotation', 'attackSpeed', 'dash', 'collider', 'currentHealth', 'model', 'hitTimer', 'size', 'sneeze', 'targetRotation', 'poisoned', 'size', 'position', 'targetMovementForce', 'sleepy', 'modifiers', 'playerState', 'playerAttackStyle')
const enemyQuery = ecs.with('faction', 'strength', 'collider', 'position', 'attacking')
const enemyWithSensor = enemyQuery.with('sensor', 'rotation').where(entity => entity.faction === Faction.Enemy)
const enemyWithoutSensor = enemyQuery.without('sensor').where(entity => entity.faction === Faction.Enemy)
const getAttackingEnemy = (player: QueryEntity<typeof playerQuery>) => {
	if (player.hitTimer.running()) return null
	for (const enemy of enemyWithoutSensor) {
		if (world.intersectionPair(enemy.collider, player.collider)) {
			return enemy
		}
	}
	for (const enemy of enemyWithSensor) {
		const intersections = getIntersections(enemy, undefined, c => c.handle === player.collider.handle)
		if (intersections) {
			return enemy
		}
	}
	return null
}

const getAttackSpeed = (e: With<Entity, 'attackSpeed' | 'sleepy'>) => {
	return e.attackSpeed.value * ANIMATION_SPEED
}

const playerContext = <E extends QueryEntity<typeof playerQuery>>(e: E) => {
	const attackingEnemy = getAttackingEnemy(e)
	const canDash = e.dash.finished() && !e.modifiers.hasModifier('honeySpot')
	const { force, isMoving } = getMovementForce(e)
	const direction = getPlayerRotation(e, force)

	return { force, isMoving, direction, touchedByEnemy: attackingEnemy, canDash }
}
const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position')

const runningAnimations = {
	right: 'runRight',
	left: 'runLeft',
	front: 'runFront',
	back: 'runBack',
} as const
const dashAnimations = {
	right: 'dashRight',
	left: 'dashLeft',
	front: 'dashFront',
	back: 'dashBack',
} as const

const attacks = ['lightAttack', 'slashAttack', 'heavyAttack'] as const
export const playerBehavior = createBehaviorTree(
	playerQuery,
	withContext('playerState', 'playerAnimator', playerContext),
	selector(
		sequence(
			inverter(inState('dead')),
			condition(({ entity }) => entity.currentHealth === 0),
			action(({ entity }) => entity.playerAnimator.playClamped('dead')),
			setState('dead'),
		),
		sequence(
			inState('dead'),
			wait(2000)('dead'),
			action(() => gameOverEvent.emit(true)),
		),

		// ! Hit
		sequence(
			inverter(inState('dead', 'hit')),
			condition(({ ctx }) => ctx.touchedByEnemy !== null),
			setState('hit'),
		),
		sequence(
			enteringState('hit'),
			action(({ ctx, entity }) => {
				if (ctx.touchedByEnemy) {
					if (ctx.touchedByEnemy.projectile) {
						ecs.remove(ctx.touchedByEnemy)
					}
					takeDamage(entity, ctx.touchedByEnemy.strength.value) }
				flash(entity, 200, 'damage')
				entity.playerAnimator.playOnce('hit', { timeScale: 1.3 }, 0.2)
				entity.hitTimer.reset()
			}),
		),
		sequence(
			inState('hit'),
			waitFor(({ entity }) => !entity.playerAnimator.isPlaying('hit')),
			setState('idle'),
		),
		// ! Stun
		sequence(
			condition(({ entity }) => entity.sneeze.finished()),
			action(({ entity }) => entity.playerAnimator.playOnce('hit', {}, 0.2)),
			action(({ entity }) => ecs.update(entity, stunBundle(entity.size.y))),
			setState('stun'),
		),

		sequence(
			inState('stun'),
			parallel(
				waitFor(({ entity }) => !entity.playerAnimator.isPlaying('hit')),
				action(({ entity }) => entity.playerAnimator.playAnimation('idle')),
			),
			wait(1000)('stun'),
			action(({ entity }) => {
				entity.sneeze.reset()
				ecs.removeComponent(entity, 'stun')
			}),
			setState('idle'),
		),

		// ! Poisoned
		sequence(
			enteringState('poisoned'),
			action(({ entity }) => {
				entity.playerAnimator.playOnce('hit')
				entity.poisoned.enabled = false
				flash(entity, 500, 'poisoned')
				ecs.add(inMap({
					parent: entity,
					position: new Vector3(0, 10, 0),
					emitter: poisonBubbles(false),
					autoDestroy: true,
				}))
				takeDamage(entity, 1)
				addCameraShake()
				spawnDamageNumber(1, entity, false)
			}),
		),
		sequence(
			inState('poisoned'),
			waitFor(({ entity }) => !entity.playerAnimator.isPlaying('hit')),
			action(({ entity }) => entity.poisoned.reset()),
			setState('idle'),
		),

		sequence(
			condition(({ entity }) => entity.poisoned.finished()),
			setState('poisoned'),
		),
		// ! Attack 0
		sequence(
			enteringState('attack0'),
			action(({ entity }) => entity.playerAnimator.playOnce(attacks[0], { timeScale: getAttackSpeed(entity) }, 0.2)),
			action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
		),
		sequence(
			inState('attack0'),
			parallel(
				condition(() => gameInputs.get('primary').justPressed),
				action(({ entity }) => entity.playerAttackStyle.lastAttack = 1),
			),
			waitFor(({ entity }) => !entity.playerAnimator.isPlaying(attacks[0])),
			selector(
				sequence(
					condition(({ entity }) => entity.playerAttackStyle.lastAttack === 0),
					setState('idle'),
				),
				setState('attack1'),
			),
		),
		// ! Attack 1
		sequence(
			enteringState('attack1'),
			action(({ entity }) => entity.playerAnimator.playOnce(attacks[1], { timeScale: getAttackSpeed(entity) }, 0.2)),
			action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
		),
		sequence(
			inState('attack1'),
			parallel(
				condition(() => gameInputs.get('primary').justPressed),
				action(({ entity }) => entity.playerAttackStyle.lastAttack = 2),
			),
			waitFor(({ entity }) => !entity.playerAnimator.isPlaying(attacks[1])),
			selector(
				sequence(
					condition(({ entity }) => entity.playerAttackStyle.lastAttack === 1),
					action(({ entity }) => entity.playerAttackStyle.lastAttack = 0),
					setState('idle'),
				),
				setState('attack2'),
			),
		),
		// ! Attack 2
		sequence(
			enteringState('attack2'),
			action(({ entity }) => entity.playerAnimator.playOnce(attacks[2], { timeScale: getAttackSpeed(entity) }, 0.2)),
			action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
		),
		sequence(
			inState('attack2'),
			waitFor(({ entity }) => !entity.playerAnimator.isPlaying(attacks[2])),
			action(({ entity }) => entity.playerAttackStyle.lastAttack = 0),
			setState('idle'),
		),
		// ! Dash
		sequence(
			selector(inState('idle'), inState('running')),
			condition(({ entity }) => gameInputs.get('secondary').justPressed && entity.dash.finished()),
			condition(() => interactionQuery.size === 0),
			setState('dash'),
		),
		sequence(
			enteringState('dash'),
			action(({ entity }) => {
				playSound('zapsplat_cartoon_whoosh_swipe_fast_grab_dash_007_74748')
				entity.dashParticles?.restart()
				entity.dashParticles?.play()
				setState('idle')
			}),
		),
		sequence(
			inState('dash'),
			action(({ entity, ctx: { force, direction } }) => {
				const dir = getRelativeDirection(direction, force)
				entity.playerAnimator.playAnimation(dashAnimations[dir], { timeScale: 1.3 })
			}),
			applyMove(({ ctx: { force } }) => force.clone().normalize().multiplyScalar(2.5)),
			wait(200)('dash'),
			action(({ entity }) => entity.dash.reset()),
			setState('idle'),
		),
		sequence(
			selector(inState('idle'), inState('running')),
			condition(() => gameInputs.get('primary').justPressed),
			condition(({ entity }) => entity.weapon),
			condition(() => interactionQuery.size === 0),
			setState('attack0'),
		),
		// ! Idle
		sequence(
			enteringState('idle'),
			action(({ entity }) => entity.playerAnimator.playAnimation('idle')),
		),
		sequence(
			inState('idle'),
			applyRotate(({ ctx: { direction } }) => direction),
			condition(({ ctx: { isMoving } }) => isMoving),
			setState('running'),
		),
		// ! Running
		sequence(
			enteringState('running'),
			action(({ entity }) => entity.playerAnimator.playAnimation('runFront', { timeScale: 2 })),
		),
		sequence(
			inState('running'),
			ifElse(
				condition(({ ctx }) => ctx.isMoving),
				sequence(
					action(({ entity, ctx: { direction, force } }) => {
						const dir = getRelativeDirection(direction, force)
						entity.playerAnimator.playAnimation(runningAnimations[dir], { timeScale: 2 })
					}),
					applyRotate(({ ctx }) => ctx.direction),
					applyMove(({ ctx }) => ctx.force),
				),
				setState('idle'),
			),
		),

	),
)
