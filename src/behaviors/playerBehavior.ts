import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { behaviorPlugin } from '../lib/behaviors'
import { flash } from '../states/dungeon/battle'
import { applyMove, applyRotate, getMovementForce, getPlayerRotation, takeDamage } from './behaviorHelpers'
import { debugOptions } from '@/debug/debugState'
import { addCameraShake } from '@/global/camera'
import type { Entity } from '@/global/entity'
import { EnemyAttackStyle, Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { campState, pausedState } from '@/global/states'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { dash } from '@/particles/dashParticles'
import { poisonBubbles } from '@/states/dungeon/poisonTrail'
import { stunBundle } from '@/states/dungeon/stun'
import { getIntersections } from '@/states/game/sensor'
import { sleep } from '@/utils/sleep'

const ANIMATION_SPEED = 1
const playerComponents = ['playerAnimator', 'movementForce', 'speed', 'body', 'rotation', 'playerControls', 'combo', 'attackSpeed', 'dash', 'collider', 'currentHealth', 'model', 'hitTimer', 'size', 'sneeze', 'targetRotation', 'poisoned', 'size', 'position', 'targetMovementForce', 'sleepy', 'modifiers'] as const satisfies readonly (keyof Entity)[]
type PlayerComponents = (typeof playerComponents)[number]
const playerQuery = ecs.with(...playerComponents)
const enemyQuery = ecs.with('faction', 'state', 'strength', 'collider', 'position', 'rotation').where(e => e.faction === Faction.Enemy && e.state === 'attack')
const enemyWithSensor = enemyQuery.with('sensor')
const enemyWithoutSensor = enemyQuery.without('sensor')
const interactionQuery = ecs.with('interactionContainer')
const getAttackingEnemy = (player: With<Entity, PlayerComponents>) => {
	if (player.hitTimer.running()) return null
	for (const enemy of enemyWithoutSensor) {
		if (enemy.attackStyle !== EnemyAttackStyle.Melee) {
			if (world.intersectionPair(enemy.collider, player.collider)) {
				return enemy
			}
		}
	}
	for (const enemy of enemyWithSensor) {
		const intersections = getIntersections(enemy, undefined, c => c === player.collider)
		if (intersections && (enemy.enemyAnimator?.getTimeRatio() ?? 1) > 0.3) {
			return enemy
		}
	}
	return null
}

const getAttackSpeed = (e: With<Entity, 'attackSpeed' | 'sleepy'>) => {
	return e.attackSpeed.value * ANIMATION_SPEED
}

export const playerBehaviorPlugin = behaviorPlugin(
	playerQuery,
	'player',
	(e) => {
		const attackingEnemy = getAttackingEnemy(e)
		const sneezing = e.sneeze.finished()
		const poisoned = e.poisoned.finished()
		const canDash = e.dash.finished() && !e.modifiers.hasModifier('honeySpot')
		const { force, isMoving } = getMovementForce(e)
		const direction = getPlayerRotation(e, force)
		return { force, isMoving, direction, touchedByEnemy: attackingEnemy, sneezing, poisoned, canDash }
	},
)({
	idle: {
		enter: e => e.playerAnimator.playAnimation('idle'),
		update: (e, setState, { isMoving, touchedByEnemy, sneezing, canDash, poisoned, direction }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			applyRotate(e, direction)
			if (isMoving) {
				setState('running')
			}
			if (!campState.enabled || debugOptions.attackInFarm()) {
				if (e.playerControls.get('primary').justReleased && e.weapon) {
					if (interactionQuery.size === 0) {
						setState('attack')
					}
				}
				if (e.playerControls.get('secondary').justReleased && canDash) {
					setState('dash')
				}
			}
		},
	},
	running: {
		enter: e => e.playerAnimator.playAnimation('running'),
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, canDash, poisoned, direction }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			if (isMoving) {
				applyRotate(e, direction)
				applyMove(e, force)
			} else {
				setState('idle')
			}
			if ((!campState.enabled || debugOptions.attackInFarm())) {
				if (e.playerControls.get('primary').justReleased && e.weapon) {
					setState('attack')
				}
				if (e.playerControls.get('secondary').justReleased && canDash) {
					setState('dash')
				}
			}
		},
	},
	attack: {
		enter: async (e, setupState) => {
			if (e.combo.lastAttack === 0) {
				!pausedState.enabled && playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])
				await e.playerAnimator.playOnce('lightAttack', { timeScale: getAttackSpeed(e) }, 0.5)
			}
			if (e.combo.lastAttack === 1) {
				!pausedState.enabled && playSound(['Slash_Attack_Light_1', 'Slash_Attack_Light_2'])
				await e.playerAnimator.playOnce('slashAttack', { timeScale: getAttackSpeed(e) }, 0.2)
			}
			if (e.combo.lastAttack === 2) {
				!pausedState.enabled && playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])
				await e.playerAnimator.playClamped('heavyAttack', { timeScale: getAttackSpeed(e) })
			}
			e.combo.lastAttack = 0
			setupState('idle')
		},
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, poisoned, direction }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			if (isMoving) {
				applyRotate(e, direction)
				applyMove(e, force.multiplyScalar(0.5))
			}
			if (e.playerControls.get('primary').justPressed) {
				if (e.combo.lastAttack === 0 && e.playerAnimator.current === 'lightAttack') {
					e.combo.lastAttack = 1
				} else if (e.combo.lastAttack === 1 && e.playerAnimator.current === 'slashAttack') {
					e.combo.lastAttack = 2
				}
			}
		},
	},
	dying: {
		enter: async (e, setState) => {
			await e.playerAnimator.playClamped('dying')
			setState('dead')
		},
	},
	dead: {},
	picking: {},
	dash: {
		enter: async (e, setState) => {
			playSound('zapsplat_cartoon_whoosh_swipe_fast_grab_dash_007_74748')
			e.playerAnimator.playAnimation('running')
			ecs.add({ parent: e, ...dash(1) })
			await sleep(200)
			setState('idle')
		},
		update: (e, _setState, { force }) => {
			if (force) {
				applyMove(e, force.clone().normalize().multiplyScalar(3))
			}
		},
		exit: (e) => {
			e.dash.reset()
		},
	},
	hit: {
		enter: async (e, setState, { touchedByEnemy }) => {
			if (touchedByEnemy) {
				takeDamage(e, touchedByEnemy.strength.value)
				if (touchedByEnemy.projectile) {
					ecs.remove(touchedByEnemy)
				}
				addCameraShake()
				flash(e, 200, 'damage')
				await e.playerAnimator.playOnce('hit', { timeScale: 1.3 })
				if (e.currentHealth <= 0) setState('dying')
				setState('idle')
			}
		},
		exit: (e) => {
			e.hitTimer.reset()
		},
	},
	stun: {
		enter: async (e, setState) => {
			ecs.update(e, stunBundle(e.size.y))
			await sleep(1000)
			e.sneeze.reset()
			setState('idle')
		},
	},
	poisoned: {
		enter: (e, setState) => {
			e.poisoned.enabled = false
			flash(e, 500, 'poisoned')
			setState('idle')
			ecs.add({
				parent: e,
				position: new Vector3(0, 10, 0),
				emitter: poisonBubbles(false),
				autoDestroy: true,
			})
			takeDamage(e, 1)
			addCameraShake()
			spawnDamageNumber(1, e, false)
			sleep(2000).then(() => {
				e.poisoned.reset()
			})
		},
	},
},

)
