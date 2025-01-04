import type { AttackStyle, Entity, QueryEntity } from '@/global/entity'
import type { With } from 'miniplex'
import type { EntityState } from '../lib/behaviors'
import { Faction } from '@/global/entity'
import { assets, coroutines, ecs, time, tweens, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { Timer } from '@/lib/timer'
import { getWorldPosition } from '@/lib/transforms'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { pollenBundle } from '@/particles/pollenParticles'
import { selectNewLockedEnemey } from '@/states/dungeon/locking'
import { getIntersections } from '@/states/game/sensor'
import { sleep } from '@/utils/sleep'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { circIn } from 'popmotion'
import { between } from 'randomish'
import { AdditiveBlending, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { behaviorPlugin } from '../lib/behaviors'
import { projectileAttack } from '../states/dungeon/attacks'
import { calculateDamage, flash } from '../states/dungeon/battle'
import { stunBundle } from '../states/dungeon/stun'
import { applyMove, applyRotate, getMovementForce, takeDamage } from './behaviorHelpers'

export const playerQuery = ecs.with('position', 'strength', 'body', 'critChance', 'critDamage', 'combo', 'playerAnimator', 'weapon', 'player', 'collider', 'sensor', 'rotation').where(({ faction }) => faction === Faction.Player)

const enemyComponents = ['movementForce', 'body', 'speed', 'enemyAnimator', 'rotation', 'position', 'group', 'strength', 'collider', 'model', 'currentHealth', 'size', 'hitTimer', 'targetRotation', 'sensor'] as const satisfies readonly (keyof Entity)[]
const enemyQuery = ecs.with(...enemyComponents)

type EnemyComponents = (typeof enemyComponents)[number]
const navGridQuery = ecs.with('navGrid')

const getPlayerDirection = (e: With<Entity, EnemyComponents>, player: With<Entity, 'position'> | undefined) => {
	if (!player) return null

	const direction = player.position.clone().sub(e.position).normalize()
	const hit = world.castShape(e.position, e.rotation, direction, e.collider.shape, 1, 20, false, undefined, collisionGroups('any', ['obstacle', 'player']), undefined, undefined)
	const obstacle = hit && hit?.collider !== player.collider
	const navGrid = navGridQuery.first?.navGrid
	const canSeePlayer = player.position.distanceTo(e.position) < 70
	if (obstacle && navGrid) {
		const navPoint = navGrid.findPath(e.position, player.position)?.sub(e.position).normalize()
		return {
			direction: navPoint ?? null,
			canSeePlayer,
			canShootPlayer: !obstacle,
		}
	}
	return { direction, canSeePlayer, canShootPlayer: !obstacle }
}
const enemyDecisions = (e: With<Entity, EnemyComponents>) => {
	const player = playerQuery.first
	const playerData = getPlayerDirection(e, player)
	const touchedByPlayer = !e.hitTimer.running() && player && player.state === 'attack' && getIntersections(player) === e.collider
	return { ...getMovementForce(e), player, touchedByPlayer, ...playerData }
}

type EnemyState = EntityState<QueryEntity<typeof enemyQuery>, 'enemy', typeof enemyDecisions>

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

const idle: EnemyState = () => ({
	enter: (e) => {
		e.enemyAnimator.playAnimation('idle')
		e.movementForce.setScalar(0)
	},
	update: (e, setState, { player, direction, touchedByPlayer, canSeePlayer }) => {
		if (touchedByPlayer) return setState('hit')
		if (direction && player && canSeePlayer && !e.inactive) {
			e.movementForce.x = direction.x
			e.movementForce.z = direction.z
			ecs.removeComponent(e, 'wander')
			return setState('running')
		} else {
			return setState('wander')
		}
	},
})
const running = (range: number): EnemyState => () => ({
	enter: e => e.enemyAnimator.playAnimation('running'),
	update: (e, setState, { force, direction, player, touchedByPlayer, canShootPlayer }) => {
		if (touchedByPlayer) return setState('hit')
		if (direction && player) {
			const dist = player.position.distanceTo(e.position)
			if (dist < 70) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
				applyRotate(e, force)
				if (dist < range && canShootPlayer) {
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
const wander: EnemyState = () => ({
	enter: (e) => {
		ecs.update(e, wanderBundle(e))
	},
	update: (e, setState, { canSeePlayer, force }) => {
		if (canSeePlayer && !e.inactive) return setState('idle')

		if (e.wander) {
			if (e.wander.cooldown.finished() || e.inactive?.running()) {
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
})
const waitingAttack = (cooldown: number): EnemyState => () => ({
	enter: async (e, setState, { direction }) => {
		e.enemyAnimator.playAnimation('idle')
		flash(e, cooldown, 'preparing')
		if (direction) {
			e.movementForce.x = direction.x
			e.movementForce.z = direction.z
		}
		await sleep(cooldown)
		return setState('attack')
	},
	update: (e, setState, { touchedByPlayer, force }) => {
		if (touchedByPlayer) return setState('hit')
		applyRotate(e, force)
	},
})
const hit: EnemyState = () => ({
	enter: async (e, setState, { player }) => {
		if (player) {
			playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])
			// ! damage
			const [damage, crit] = calculateDamage(player)
			takeDamage(e, damage)
			e.enemyImpact?.restart()
			e.enemyImpact?.play()
			spawnDamageNumber(damage, e, crit)
			// ! knockback
			const force = player.position.clone().sub(e.position).normalize().multiplyScalar(-50000)
			e.body.applyImpulse(force, true)
			// ! damage flash
			const originalScale = e.group.scale.clone()
			tweens.add({
				from: originalScale,
				to: new Vector3(0.8, 1.5, 0.8),
				duration: 300,
				ease: circIn,
				repeat: 1,
				repeatType: 'reverse',
				onUpdate: f => e.group.scale.copy(f),
			})
			flash(e, 200, 'damage')
			await e.enemyAnimator.playClamped('hit')
			if (e.currentHealth <= 0) {
				return setState('dying')
			} else {
				return setState('idle')
			}
		}
	},
})
const dying: EnemyState = () => ({
	enter: async (e, setState) => {
		if (e.lockedOn) {
			selectNewLockedEnemey()
			ecs.removeComponent(e, 'lockedOn')
			ecs.removeComponent(e, 'outline')
		}
		await e.enemyAnimator.playClamped('dead')
		return setState('dead')
	},
})

const stun: EnemyState = () => ({
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
})

const attackCooldown = (delay: number, escape: boolean): EnemyState => () => ({
	enter: async (e, setState, { direction, player }) => {
		e.enemyAnimator.playAnimation('running')
		if (direction && player && escape) {
			if (e.position.distanceTo(player.position) < 40) {
				e.movementForce.x = -direction.x
				e.movementForce.z = -direction.z
			}
		}
		await sleep(delay)
		return setState('idle')
	},
	update: (e, setState, { touchedByPlayer, force, direction }) => {
		if (touchedByPlayer) return setState('hit')
		if (direction) {
			if (!escape) {
				e.movementForce.x = direction.x
				e.movementForce.z = direction.z
			}
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(0.5))
		}
	},
})

const enemyBehavior = (attackStyle: keyof AttackStyle) => behaviorPlugin(
	enemyQuery.with(attackStyle),
	'enemy',
	enemyDecisions,
)

// ! SPORE
export const sporeBehaviorPlugin = enemyBehavior('spore')({
	idle,
	wander,
	running: running(50),
	waitingAttack: waitingAttack(800),
	attack: () => ({
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('attacking')
			ecs.add({
				...inMap(),
				position: e.position.clone().add(new Vector3(0, 0, 15).applyQuaternion(e.rotation)),
				...pollenBundle(0xCFE0ED, 0xCFD1ED),
				sleepingPowder: true,
			})
			await sleep(800)
			return setState('attackCooldown')
		},
		update: (e, setState, { force, touchedByPlayer }) => {
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(0.5))
			if (touchedByPlayer) return setState('hit')
		},
	}),
	hit,
	dying,
	stun,
	dead: () => ({}),
	attackCooldown: attackCooldown(4000, false),
})

// ! RANGE
export const rangeEnemyBehaviorPlugin = enemyBehavior('range')({
	idle,
	wander,
	running: running(50),
	waitingAttack: waitingAttack(200),
	attack: () => ({
		enter: async (e, setState, { force }) => {
			applyRotate(e, force)
			projectileAttack(e.rotation.clone())(e)
			await e.enemyAnimator.playClamped('attacking', { timeScale: 2 })
			if (e.range.amount < e.range.max) {
				e.range.amount++
				return setState('waitingAttack')
			} else {
				e.range.amount = 0
				return setState('attackCooldown')
			}
		},
		update: (_e, setState, { touchedByPlayer }) => {
			if (touchedByPlayer) return setState('hit')
		},
	}),
	hit,
	dying,
	stun,
	dead: () => ({}),
	attackCooldown: attackCooldown(1000, true),

})

// ! CHARGING TWICE
const obstableQuery = ecs.with('collider', 'obstacle', 'position')
export const chargingEnemyBehaviorPlugin = enemyBehavior('charging')({
	idle,
	dying,
	waitingAttack: waitingAttack(500),
	hit,
	stun,
	wander,
	running: running(30),
	dead: () => ({}),
	attack: () => ({
		enter: async (e, setState) => {
			e.dashParticles?.restart()
			e.dashParticles?.play()
			e.enemyAnimator.playAnimation('running')
			await sleep(800)
			if (e.charging.amount < e.charging.max) {
				e.charging.amount++
				return setState('waitingAttack')
			} else {
				e.charging.amount = 0
				return setState('attackCooldown')
			}
		},
		update: (e, setState, { force, touchedByPlayer, player }) => {
			applyRotate(e, force)
			applyMove(e, force.multiplyScalar(2))
			if (touchedByPlayer) return setState('hit')
			world.contactPairsWith(e.collider, (c) => {
				for (const obstacle of obstableQuery) {
					if (obstacle.collider === c && getIntersections(e) === c) {
						playSound('zapsplat_impacts_wood_rotten_tree_trunk_hit_break_crumple_011_102694')
						e.charging.amount = 0
						return setState('stun')
					}
				}
				if (player && c === player.collider) {
					e.charging.amount = 0
					return setState('attackCooldown')
				}
			})
		},
	}),
	attackCooldown: attackCooldown(2000, false),
})

// ! MELEE
export const meleeEnemyBehaviorPlugin = enemyBehavior('melee')({
	idle,
	dying,
	waitingAttack: waitingAttack(200),
	hit,
	stun,
	wander,
	running: running(10),
	dead: () => ({}),
	attack: () => ({
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
	}),
	attackCooldown: attackCooldown(2000, false),
})

// ! JUMPING

export const jumpingEnemyBehaviorPlugin = enemyBehavior('jumping')({
	idle,
	dying,
	waitingAttack: waitingAttack(200),
	hit,
	stun,
	wander,
	running: running(30),
	dead: () => ({}),
	attack: () => ({
		enter: async (e, setState) => {
			e.enemyAnimator.playAnimation('idle')
			coroutines.add(function* () {
				while (e.position.y < 25) {
					e.movementForce.copy(new Vector3(0, 3, e.position.y / 10).applyQuaternion(e.targetRotation))
					yield
				}
				while (e.position.y > 5) {
					e.movementForce.copy(new Vector3(0, -3, 1).applyQuaternion(e.targetRotation))
					yield
				}

				setState('attackCooldown')
				e.movementForce.copy(new Vector3(0, 0, 0))
				playSound('zapsplat_multimedia_game_sound_thump_hit_bubble_deep_underwater_88732')
				const impact = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ map: assets.textures.circle_01, transparent: true, blending: AdditiveBlending, depthWrite: false }))
				impact.rotateX(-Math.PI / 2)
				const impactEntity = ecs.add({
					model: impact,
					faction: Faction.Enemy,
					state: 'attack',
					bodyDesc: RigidBodyDesc.fixed(),
					strength: e.strength,
					colliderDesc: ColliderDesc.cylinder(1, 1).setSensor(true),
					position: e.position.clone(),
				})
				tweens.add({
					from: 2,
					to: 15,
					duration: 300,
					destroy: impactEntity,
					onUpdate: (f) => {
						impact.scale.setScalar(f)
						if (impactEntity.collider) {
							impactEntity.collider.setRadius(f * 0.8)
						}
					},
				})
			})
		},
		update: (e, setState, { force, touchedByPlayer }) => {
			applyRotate(e, force)
			applyMove(e, force)
			if (touchedByPlayer) return setState('hit')
		},
	}),
	attackCooldown: attackCooldown(4000, false),
})