import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { between } from 'randomish'
import { projectileAttack } from '../states/dungeon/attacks'
import { calculateDamage, flash } from '../states/dungeon/battle'
import { stunBundle } from '../states/dungeon/stun'
import type { EntityState } from '../lib/behaviors'
import { behaviorPlugin } from '../lib/behaviors'
import { applyMove, applyRotate, getMovementForce } from './behaviorHelpers'
import type { Entity } from '@/global/entity'
import { EnemyAttackStyle, Faction } from '@/global/entity'
import { ecs, time, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { addTweenTo } from '@/lib/updateTween'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { dash } from '@/particles/dashParticles'
import { impact } from '@/particles/impact'
import { sleep } from '@/utils/sleep'
import { Timer } from '@/lib/timer'
import { getWorldPosition } from '@/lib/transforms'

export const playerQuery = ecs.with('position', 'sensorCollider', 'strength', 'body', 'critChance', 'critDamage', 'combo', 'playerAnimator', 'weapon', 'player', 'collider').where(({ faction }) => faction === Faction.Player)

const enemyComponents = ['movementForce', 'body', 'speed', 'enemyAnimator', 'rotation', 'position', 'group', 'strength', 'collider', 'model', 'currentHealth', 'size', 'sensorCollider'] as const satisfies readonly (keyof Entity)[]

const enemyQuery = ecs.with(...enemyComponents)

type EnemyComponents = (typeof enemyComponents)[number]

const enemyDecisions = (e: With<Entity, EnemyComponents>) => {
	const player = playerQuery.first
	const direction = player ? player.position.clone().sub(e.position).normalize() : null
	const canSeePlayer = player && player.position.distanceTo(e.position) < 70
	const touchedByPlayer = player && player.state === 'attack' && world.intersectionPair(player.sensorCollider, e.collider)
	return { ...getMovementForce(e), player, direction, touchedByPlayer, canSeePlayer }
}

type EnemyState = EntityState<EnemyComponents, 'enemy', typeof enemyDecisions>

const wanderBundle = (e: With<Entity, EnemyComponents>) => {
	const origin = getWorldPosition(e.group)
	const angle = Math.random() * Math.PI * 2
	const distance = between(20, 50)
	return {
		wander: {
			target: origin.add(new Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)),
			cooldown: new Timer(between(2000, 5000), false),
		},
	} as const satisfies Entity
}

const idle: EnemyState = {
	enter: (e) => {
		e.enemyAnimator.playAnimation('idle')
		e.movementForce.setScalar(0)
	},
	update: (e, setState, { player, direction, touchedByPlayer, canSeePlayer }) => {
		if (touchedByPlayer) return setState('hit')
		if (direction && player && canSeePlayer) {
			e.movementForce.x = direction.x
			e.movementForce.z = direction.z
			ecs.removeComponent(e, 'wander')
			return setState('running')
		} else {
			return setState('wander')
		}
	},
}
const running = (range: number): EnemyState => ({
	enter: e => e.enemyAnimator.playAnimation('running'),
	update: (e, setState, { force, direction, player, touchedByPlayer }) => {
		if (touchedByPlayer) return setState('hit')
		if (direction && player) {
			const dist = player.position.distanceTo(e.position)
			if (dist < 70) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
				if (dist < range) {
					return setState('waitingAttack')
				}
			} else {
				return setState('idle')
			}
		}

		applyRotate(e, force)
		applyMove(e, force)
	},
})
const wander: EnemyState = {
	enter: (e) => {
		ecs.update(e, wanderBundle(e))
	},
	update: (e, setState, { canSeePlayer, force }) => {
		if (canSeePlayer) return setState('idle')

		if (e.wander) {
			if (e.wander.cooldown.finished()) {
				e.enemyAnimator.playAnimation('running')
				const direction = e.wander.target.clone().sub(e.position).normalize()
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
				applyRotate(e, direction)
				applyMove(e, force.multiplyScalar(0.5))
				const dist = e.wander.target.distanceTo(e.position)
				if (dist < 3) {
					return setState('idle')
				}
			} else {
				e.enemyAnimator.playAnimation('idle')
				e.wander.cooldown.tick(time.delta)
			}
		}
	},
	exit: (e) => {
		ecs.removeComponent(e, 'wander')
	},
}
const waitingAttack = (cooldown: number): EnemyState => ({
	enter: async (e, setState) => {
		e.enemyAnimator.playAnimation('idle')
		ecs.update(e, { tween: flash(e, cooldown, false) })
		await sleep(cooldown)

		return setState('attack')
	},
	update: (_e, setState, { touchedByPlayer }) => {
		if (touchedByPlayer) return setState('hit')
	},
})
const hit: EnemyState = {
	enter: async (e, setState, { player }) => {
		if (player) {
			playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])
			// ! damage
			const [damage, crit] = calculateDamage(player)
			e.currentHealth -= damage
			ecs.update(e, { emitter: impact() })
			spawnDamageNumber(damage, e, crit)
			// ! knockback
			const force = player.position.clone().sub(e.position).normalize().multiplyScalar(-50000)
			e.body.applyImpulse(force, true)
			// ! damage flash
			addTweenTo(e)(
				new Tween(e.group.scale).to(new Vector3(0.8, 1.2, 0.8), 200).repeat(1).yoyo(true),
				flash(e, 200, true),
			)
			await e.enemyAnimator.playClamped('hit')
			if (e.currentHealth <= 0) {
				return setState('dying')
			} else {
				return setState('idle')
			}
		}
	},
}
const dying: EnemyState = {
	enter: async (e, setState) => {
		await e.enemyAnimator.playClamped('dead')
		return setState('dead')
	},
}

const stun: EnemyState = {
	enter: async (e, setState) => {
		ecs.update(e, stunBundle(e.size.y))
		e.enemyAnimator.play('hit')
		await sleep(1000)
		return setState('idle')
	},
	update: (_e, setState, { touchedByPlayer }) => {
		if (touchedByPlayer) return setState('hit')
	},
	exit: (e) => {
		ecs.removeComponent(e, 'stun')
	},
}
// ! RANGE
export const rangeEnemyBehaviorPlugin = behaviorPlugin(
	enemyQuery.where(e => e.attackStyle === EnemyAttackStyle.Range),
	'enemy',
	enemyDecisions,
)({
	idle,
	wander,
	running: running(50),
	waitingAttack: waitingAttack(800),
	attack: {
		enter: async (e, setState, { force }) => {
			applyRotate(e, force)
			projectileAttack(e.rotation.clone())(e)
			await e.enemyAnimator.playClamped('attacking')
			return setState('attackCooldown')
		},
		update: (_e, setState, { touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
		},
	},
	hit,
	dying,
	stun,
	dead: {},
	attackCooldown: {
		enter: async (e, setState, { direction, player }) => {
			e.enemyAnimator.playClamped('running')
			if (direction && player) {
				if (e.position.distanceTo(player.position) < 40) {
					e.movementForce.x = -direction.x
					e.movementForce.z = -direction.z
				}
			}
			await sleep(1000)
			return setState('idle')
		},
		update: (e, setState, { force, touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
			applyMove(e, force.multiplyScalar(0.5))
			applyRotate(e, force)
		},
	},

},
)

// ! CHARGING
const treeQuery = ecs.with('collider', 'tree', 'position')
export const chargingEnemyBehaviorPlugin = behaviorPlugin(
	enemyQuery.where(e => e.attackStyle === EnemyAttackStyle.Charging),
	'enemy',
	enemyDecisions,
)({
	idle,
	dying,
	waitingAttack: waitingAttack(500),
	hit,
	stun,
	wander,
	running: running(30),
	dead: {},
	attack: {
		enter: async (e, setState) => {
			ecs.add({ parent: e, ...dash(4) })
			e.enemyAnimator.playAnimation('running')
			await sleep(800)
			return setState('attackCooldown')
		},
		update: (e, setState, { force, touchedByPlayer, player }) => {
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(2))
			if (touchedByPlayer) return setState('hit')
			world.contactPairsWith(e.collider, (c) => {
				for (const tree of treeQuery) {
					if (tree.collider === c && world.intersectionPair(e.sensorCollider, c)) {
						playSound('zapsplat_impacts_wood_rotten_tree_trunk_hit_break_crumple_011_102694')
						return setState('stun')
					}
				}
				if (player && c === player.collider) {
					return setState('attackCooldown')
				}
			})
		},
	},
	attackCooldown: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('running')
			await sleep(2000)
			return setState('idle')
		},
		update: (e, setState, { touchedByPlayer, force, direction }) => {
			if (touchedByPlayer) return setState('hit')
			if (direction) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
				applyRotate(e, force)
				applyMove(e, force.multiplyScalar(0.5))
			}
		},
	},
},

)

// ! MELEE
export const meleeEnemyBehaviorPlugin = behaviorPlugin(
	enemyQuery.where(e => e.attackStyle === EnemyAttackStyle.Melee),
	'enemy',
	enemyDecisions,
)({
	idle,
	dying,
	waitingAttack: waitingAttack(200),
	hit,
	stun,
	wander,
	running: running(10),
	dead: {},
	attack: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('attacking')
			await sleep(800)
			return setState('attackCooldown')
		},
		update: (e, setState, { force, touchedByPlayer }) => {
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(0.5))
			if (touchedByPlayer) return setState('hit')
		},
	},
	attackCooldown: {
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('running')
			await sleep(2000)
			return setState('idle')
		},
		update: (e, setState, { touchedByPlayer, force, direction }) => {
			if (touchedByPlayer) return setState('hit')
			if (direction) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
				applyRotate(e, force)
				applyMove(e, force.multiplyScalar(0.5))
			}
		},
	},
},

)