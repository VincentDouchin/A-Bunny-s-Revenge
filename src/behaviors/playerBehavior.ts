import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { behaviorPlugin } from '../lib/behaviors'
import { flash } from '../states/dungeon/battle'
import { applyMove, applyRotate, getMovementForce, takeDamage } from './behaviorHelpers'
import { debugOptions } from '@/debug/debugState'
import { addCameraShake } from '@/global/camera'
import type { Entity } from '@/global/entity'
import { EnemyAttackStyle, Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { campState } from '@/global/states'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { dash } from '@/particles/dashParticles'
import { poisonBubbles } from '@/states/dungeon/poisonTrail'
import { stunBundle } from '@/states/dungeon/stun'
import { sleep } from '@/utils/sleep'

const ANIMATION_SPEED = 1
const playerComponents = ['playerAnimator', 'movementForce', 'speed', 'body', 'rotation', 'playerControls', 'combo', 'attackSpeed', 'dash', 'collider', 'currentHealth', 'model', 'hitTimer', 'size', 'sneeze', 'targetRotation', 'poisoned', 'size', 'position', 'targetMovementForce'] as const satisfies readonly (keyof Entity)[]
type PlayerComponents = (typeof playerComponents)[number]
const playerQuery = ecs.with(...playerComponents)
const enemyQuery = ecs.with('faction', 'state', 'strength', 'collider').where(e => e.faction === Faction.Enemy && e.state === 'attack')
const interactionQuery = ecs.with('interactionContainer')
const getAttackingEnemy = (player: With<Entity, PlayerComponents>) => {
	if (player.hitTimer.running()) return null
	for (const enemy of enemyQuery) {
		if (enemy.attackStyle !== EnemyAttackStyle.Melee || (enemy.enemyAnimator?.getTimeRatio() ?? 1) > 0.3) {
			if (world.intersectionPair(enemy.sensorCollider ?? enemy.collider, player.collider)) {
				return enemy
			}
		}
	}
	return null
}
export const playerBehaviorPlugin = behaviorPlugin(
	playerQuery,
	'player',
	(e) => {
		const attackingEnemy = getAttackingEnemy(e)
		const sneezing = e.sneeze.finished()
		const poisoned = e.poisoned.finished()
		const canDash = e.dash.finished() && !e.speed.hasModifier('beeBoss')
		return { ...getMovementForce(e), touchedByEnemy: attackingEnemy, sneezing, poisoned, canDash }
	},
)({
	idle: {
		enter: e => e.playerAnimator.playAnimation('idle'),
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, canDash, poisoned }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			if (isMoving) {
				applyRotate(e, force)
				setState('running')
			}
			if (!campState.enabled || debugOptions.attackInFarm) {
				if (e.playerControls.get('primary').justReleased && e.weapon && interactionQuery.size === 0) {
					setState('attack')
				}
				if (e.playerControls.get('secondary').justReleased && canDash) {
					setState('dash')
				}
			}
		},
	},
	running: {
		enter: e => e.playerAnimator.playAnimation('running'),
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, canDash, poisoned }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			if (isMoving) {
				applyRotate(e, force)
				applyMove(e, force)
			} else {
				setState('idle')
			}
			if ((!campState.enabled || debugOptions.attackInFarm)) {
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
				playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])
				await e.playerAnimator.playOnce('lightAttack', { timeScale: e.attackSpeed.value * ANIMATION_SPEED }, 0.5)
			}
			if (e.combo.lastAttack === 1) {
				playSound(['Slash_Attack_Light_1', 'Slash_Attack_Light_2'])
				await e.playerAnimator.playOnce('slashAttack', { timeScale: e.attackSpeed.value * 0.8 * ANIMATION_SPEED }, 0.2)
			}
			if (e.combo.lastAttack === 2) {
				playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'])
				await e.playerAnimator.playClamped('heavyAttack', { timeScale: 0.8 * e.attackSpeed.value * ANIMATION_SPEED })
			}
			e.combo.lastAttack = 0
			setupState('idle')
		},
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, poisoned }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (poisoned) return setState('poisoned')
			if (isMoving) {
				applyRotate(e, force)
				applyMove(e, force.multiplyScalar(0.8))
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
		update: (e, _setState) => {
			applyMove(e, new Vector3(0, 0, 3).applyQuaternion(e.rotation))
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
