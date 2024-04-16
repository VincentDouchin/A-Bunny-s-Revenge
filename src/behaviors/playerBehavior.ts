import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { flash } from '../states/dungeon/battle'
import { behaviorPlugin } from '../lib/behaviors'
import { applyMove, applyRotate, getMovementForce, takeDamage } from './behaviorHelpers'
import { addCameraShake } from '@/global/camera'
import type { Entity } from '@/global/entity'
import { EnemyAttackStyle, Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { dash } from '@/particles/dashParticles'
import { sleep } from '@/utils/sleep'
import { campState } from '@/global/states'
import { stunBundle } from '@/states/dungeon/stun'

const ANIMATION_SPEED = 1.4
const playerComponents = ['playerAnimator', 'movementForce', 'speed', 'body', 'rotation', 'playerControls', 'combo', 'attackSpeed', 'dash', 'collider', 'currentHealth', 'model', 'hitTimer', 'size', 'sneeze'] as const satisfies readonly (keyof Entity)[]
type PlayerComponents = (typeof playerComponents)[number]
const playerQuery = ecs.with(...playerComponents)
const enemyQuery = ecs.with('faction', 'state', 'strength', 'collider').where(e => e.faction === Faction.Enemy && e.state === 'attack')
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
		const canDash = e.dash.finished() && !e.speed.hasModifier('beeBoss')
		return { ...getMovementForce(e), touchedByEnemy: attackingEnemy, sneezing, canDash }
	},
)({
	idle: {
		enter: e => e.playerAnimator.playAnimation('idle'),
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, canDash }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (isMoving) {
				applyRotate(e, force)
				setState('running')
			}
			if (!campState.enabled) {
				if (e.playerControls.get('primary').justPressed) {
					setState('attack')
				}
				if (e.playerControls.get('secondary').justPressed && canDash) {
					setState('dash')
				}
			}
		},
	},
	running: {
		enter: e => e.playerAnimator.playAnimation('running'),
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing, canDash }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (isMoving) {
				applyRotate(e, force)
				applyMove(e, force)
			} else {
				setState('idle')
			}
			if (!campState.enabled) {
				if (e.playerControls.get('primary').justPressed) {
					setState('attack')
				}
				if (e.playerControls.get('secondary').justPressed && canDash) {
					setState('dash')
				}
			}
		},
	},
	attack: {
		enter: async (e, setupState) => {
			if (e.combo.lastAttack === 0) {
				playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'], { volume: 0.2 })
				await e.playerAnimator.playOnce('lightAttack', { timeScale: e.attackSpeed.value * ANIMATION_SPEED }, 0.5)
			}
			if (e.combo.lastAttack === 1) {
				playSound(['Slash_Attack_Light_1', 'Slash_Attack_Light_2'], { volume: 0.2 })
				await e.playerAnimator.playOnce('slashAttack', { timeScale: e.attackSpeed.value * 0.8 * ANIMATION_SPEED }, 0.2)
			}
			if (e.combo.lastAttack === 2) {
				playSound(['Slash_Attack_Heavy_1', 'Slash_Attack_Heavy_2', 'Slash_Attack_Heavy_3'], { volume: 0.2 })
				await e.playerAnimator.playClamped('heavyAttack', { timeScale: e.attackSpeed.value * ANIMATION_SPEED })
			}
			e.combo.lastAttack = 0
			setupState('idle')
		},
		update: (e, setState, { isMoving, force, touchedByEnemy, sneezing }) => {
			if (touchedByEnemy) return setState('hit')
			if (sneezing) return setState('stun')
			if (isMoving) {
				applyRotate(e, force)
				applyMove(e, force.multiplyScalar(0.5))
			}
			if (e.playerControls.get('primary').justReleased) {
				if (e.combo.lastAttack === 0 && e.playerAnimator.current === 'lightAttack') {
					e.combo.lastAttack = 1
				} else if (e.combo.lastAttack === 1 && e.playerAnimator.current === 'slashAttack') {
					e.combo.lastAttack = 2
				}
			}
		},
	},
	dying: {
		enter: async (_, setState) => {
			sleep(1000)
			setState('dead')
		},
	},
	dead: {},
	picking: {},
	dash: {
		enter: async (e, setState) => {
			playSound('zapsplat_cartoon_whoosh_swipe_fast_grab_dash_007_74748', { volume: 0.2 })
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
				ecs.update(e, { tween: flash(e) })
				if (e.currentHealth <= 0) setState('dying')
				await sleep(500)
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
			ecs.removeComponent(e, 'stun')
			e.sneeze.reset()
			setState('idle')
		},
	},
},

)
