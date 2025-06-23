import type { Entity, QueryEntity } from '@/global/entity'
import type { With } from 'miniplex'
import { addCameraShake } from '@/global/camera'
import { Faction, States, states } from '@/global/entity'
import { gameOverEvent } from '@/global/events'
import { ecs, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { poisonBubbles } from '@/states/dungeon/poisonTrail'
import { stunBundle } from '@/states/dungeon/stun'
import { getIntersections } from '@/states/game/sensor'
import { Vector3 } from 'three'
import { action, condition, createBehaviorTree, enteringState, ifElse, inState, inverter, parallel, selector, sequence, setState, wait, waitFor, withContext } from '../lib/behaviors'
import { flash } from '../states/dungeon/battle'
import { applyMove, applyRotate, getMovementForce, getPlayerRotation, getRelativeDirection, takeDamage } from './behaviorHelpers'

const ANIMATION_SPEED = 1.3
const playerQuery = ecs.with('playerAnimator', 'movementForce', 'speed', 'body', 'rotation', 'playerControls', 'attackSpeed', 'dash', 'collider', 'currentHealth', 'model', 'hitTimer', 'size', 'sneeze', 'targetRotation', 'poisoned', 'size', 'position', 'targetMovementForce', 'sleepy', 'modifiers', 'playerAttackStyle', 'state', ...states(States.player))
const enemyQuery = ecs.with('faction', 'state', 'strength', 'collider', 'position', 'rotation')
const enemyWithSensor = enemyQuery.with('sensor').where(e => e.faction === Faction.Enemy && e.state.current === 'attack')
const enemyWithoutSensor = enemyQuery.without('sensor').where(e => e.faction === Faction.Enemy && e.state.current === 'attack')
// const interactionQuery = ecs.with('interactionContainer')
// const dialogQuery = ecs.with('dialog')
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

const playerContext = <E extends QueryEntity<typeof playerQuery>, R extends Array<any>>(...args: [E, ...R]) => {
	const [e] = args
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
	withContext(
		playerContext,
		selector(
			sequence(
				inState('dead'),
				wait('dead', 2000),
				action(() => gameOverEvent.emit(true)),
			),
			// ! Hit
			sequence(
				enteringState('hit'),
				action((e, c) => {
					if (c.touchedByEnemy) {
						if (c.touchedByEnemy.projectile) {
							ecs.remove(c.touchedByEnemy)
						}
						takeDamage(e, c.touchedByEnemy.strength.value) }
					flash(e, 200, 'damage')
					e.playerAnimator.playOnce('hit', { timeScale: 1.3 }, 0.2)
					e.hitTimer.reset()
				}),

				parallel(
					condition(e => e.currentHealth === 0),
					action(e => e.playerAnimator.playClamped('dead')),
					setState('dead'),
				),
			),
			sequence(
				inverter(inState('dead', 'hit')),
				condition((_e, c) => c.touchedByEnemy !== null),
				setState('hit'),
			),
			sequence(
				inState('hit'),
				waitFor(e => !e.playerAnimator.isPlaying('hit')),
				setState('idle'),
			),

			// ! Poisoned
			sequence(
				enteringState('poisoned'),
				action((e) => {
					e.playerAnimator.playOnce('hit')
					e.poisoned.enabled = false
					flash(e, 500, 'poisoned')
					ecs.add({
						parent: e,
						position: new Vector3(0, 10, 0),
						emitter: poisonBubbles(false),
						autoDestroy: true,
					})
					takeDamage(e, 1)
					addCameraShake()
					spawnDamageNumber(1, e, false)
				}),
			),
			sequence(
				inState('poisoned'),
				waitFor(e => !e.playerAnimator.isPlaying('hit')),
				action(e => e.poisoned.reset()),
				setState('idle'),
			),
			sequence(
				inverter(inState('stun', 'dead', 'hit')),
				condition((...[e]) => e.sneeze.finished()),
				setState('stun'),
			),
			sequence(
				condition((...[e]) => e.poisoned.finished()),
				setState('poisoned'),
			),
			// ! Attack 0
			sequence(
				enteringState('attack0'),
				action(e => e.playerAnimator.playOnce(attacks[0], { timeScale: getAttackSpeed(e) }, 0.2)),
				action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
			),
			sequence(
				inState('attack0'),
				parallel(
					condition(e => e.playerControls.get('primary').justPressed),
					action(e => e.playerAttackStyle.lastAttack = 1),
				),
				waitFor(e => !e.playerAnimator.isPlaying(attacks[0])),
				selector(
					sequence(
						condition(e => e.playerAttackStyle.lastAttack === 0),
						setState('idle'),
					),
					setState('attack1'),
				),
			),
			// ! Attack 1
			sequence(
				enteringState('attack1'),
				action(e => e.playerAnimator.playOnce(attacks[1], { timeScale: getAttackSpeed(e) }, 0.2)),
				action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
			),
			sequence(
				inState('attack1'),
				parallel(
					condition(e => e.playerControls.get('primary').justPressed),
					action(e => e.playerAttackStyle.lastAttack = 2),
				),
				waitFor(e => !e.playerAnimator.isPlaying(attacks[1])),
				selector(
					sequence(
						condition(e => e.playerAttackStyle.lastAttack === 1),
						action(e => e.playerAttackStyle.lastAttack = 0),
						setState('idle'),
					),
					setState('attack2'),
				),
			),
			// ! Attack 2
			sequence(
				enteringState('attack2'),
				action(e => e.playerAnimator.playOnce(attacks[2], { timeScale: getAttackSpeed(e) }, 0.2)),
				action(() => playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])),
			),
			sequence(
				inState('attack2'),
				waitFor(e => !e.playerAnimator.isPlaying(attacks[2])),
				action(e => e.playerAttackStyle.lastAttack = 0),
				setState('idle'),
			),
			// ! Dash
			sequence(
				inState('idle', 'running'),
				condition(e => e.playerControls.get('secondary').justPressed && e.dash.finished()),
				condition(() => interactionQuery.size === 0),
				setState('dash'),
			),
			sequence(
				enteringState('dash'),
				action(async (e) => {
					playSound('zapsplat_cartoon_whoosh_swipe_fast_grab_dash_007_74748')
					e.dashParticles?.restart()
					e.dashParticles?.play()
					setState('idle')
				}),
			),
			sequence(
				inState('dash'),
				action((e, { force, direction }) => {
					const dir = getRelativeDirection(direction, force)
					e.playerAnimator.playAnimation(dashAnimations[dir], { timeScale: 1.3 })
				}),
				applyMove((_e, c) => c.force.clone().normalize().multiplyScalar(2.5)),
				wait('dash', 200),
				action(e => e.dash.reset()),
				setState('idle'),
			),
			sequence(
				inState('idle', 'running'),
				condition(e => e.playerControls.get('primary').justPressed),
				condition(e => e.weapon),
				condition(() => interactionQuery.size === 0),
				setState('attack0'),
			),
			// ! Idle
			sequence(
				enteringState('idle'),
				action(e => e.playerAnimator.playAnimation('idle')),
			),
			sequence(
				inState('idle'),
				applyRotate((_e, c) => c.direction),
				condition((_e, c) => c.isMoving),
				setState('running'),
			),
			// ! Running
			sequence(
				enteringState('running'),
				action(e => e.playerAnimator.playAnimation('runFront', { timeScale: 2 })),
			),
			sequence(
				inState('running'),
				ifElse(
					condition((_e, c) => c.isMoving),
					sequence(
						action((e, c) => {
							const dir = getRelativeDirection(c.direction, c.force)
							e.playerAnimator.playAnimation(runningAnimations[dir], { timeScale: 2 })
						}),
						applyRotate((_e, c) => c.direction),
						applyMove((_e, c) => c.force),
					),
					setState('idle'),
				),
			),
			// ! Stun
			sequence(
				enteringState('stun'),
				action(e => e.playerAnimator.playOnce('hit', {}, 0.2)),
				action(e => ecs.update(e, stunBundle(e.size.y))),
			),
			sequence(
				inState('stun'),
				parallel(
					waitFor(e => !e.playerAnimator.isPlaying('hit')),
					action(e => e.playerAnimator.playAnimation('idle')),
				),
				wait('stun', 1000),
				action((e) => {
					e.sneeze.reset()
					ecs.removeComponent(e, 'stun')
				}),
				setState('idle'),
			),
		),
	),
)
