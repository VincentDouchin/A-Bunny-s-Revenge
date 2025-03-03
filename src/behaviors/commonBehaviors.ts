import type { AllAnimations, AllStates, AnimatorsWith, BehaviorNode, Entity, QueryEntity, QueryKeys } from '@/global/entity'
import type { ToonMaterial } from '@/shaders/materials'
import type { soundEffects } from '@assets/assets'
import type { With } from 'miniplex'
import type { baseEnemyQuery } from './enemyBehavior'
import { Faction } from '@/global/entity'
import { ecs, tweens, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { action, condition, enteringState, inState, selector, sequence, setState, wait, waitFor } from '@/lib/behaviors'
import { collisionGroups } from '@/lib/collisionGroups'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { calculateDamage, flash, squish } from '@/states/dungeon/battle'
import { selectNewLockedEnemy } from '@/states/dungeon/locking'
import { stunBundle } from '@/states/dungeon/stun'
import { getIntersections } from '@/states/game/sensor'
import { Material, Mesh } from 'three'
import { inverter } from '../lib/behaviors'
import { applyMove, applyRotate, getMovementForce, moveToDirection, takeDamage } from './behaviorHelpers'

export const playerQuery = ecs.with('position', 'strength', 'body', 'critChance', 'critDamage', 'playerAnimator', 'weapon', 'player', 'collider', 'sensor', 'rotation', 'state', 'playerAttackStyle').where(({ faction }) => faction === Faction.Player)
const navGridQuery = ecs.with('dungeon')
const getPlayerDirection = (e: QueryEntity<typeof baseEnemyQuery>, player: With<Entity, 'position'> | undefined) => {
	if (!player) return null

	const direction = player.position.clone().sub(e.position).normalize()
	const hit = world.castShape(e.position, e.rotation, direction, e.collider.shape, 1, 20, false, undefined, collisionGroups('any', ['obstacle', 'player']), undefined, undefined)
	const obstacle = hit && hit?.collider !== player.collider
	const navGrid = navGridQuery.first?.dungeon?.navgrid
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
export const enemyContext = <E extends QueryEntity<typeof baseEnemyQuery>, R extends Array<any>>(...args: [E, ...R]) => {
	const [e] = args
	const player = playerQuery.first
	const playerData = getPlayerDirection(e, player)
	const touchedByPlayer = !e.hitTimer.running() && player && player.state.current.startsWith('attack') && getIntersections(player) === e.collider
	return { ...getMovementForce(e), player, touchedByPlayer, ...playerData }
}

type EnemyNode<S extends AllStates[] = [], A extends AllAnimations[] = []> = <E extends With<Entity, `${S[number]}State` | QueryKeys<typeof baseEnemyQuery>>, A2 extends AnimatorsWith<A[number]>>() => BehaviorNode<[E, ReturnType<typeof enemyContext>, A2]>
// ! Damaged
export const damagedByPlayer: EnemyNode<['hit' | 'dying' | 'dead']> = () => sequence(
	inverter(inState('dead', 'hit')),
	condition((_e, c, _a) => c.touchedByPlayer),
	setState('hit'),
)
// ! Waiting attack
export const waitingAttackNode = (duration: number): EnemyNode<['attack', 'waitingAttack'], ['idle']> => () => selector(
	sequence(
		enteringState('waitingAttack'),
		action((_e, _c, a) => a.playAnimation('idle')),
		action(e => flash(e, duration, 'preparing')),
		moveToDirection(),
	),
	sequence(
		inState('waitingAttack'),
		wait('waitingAttack', duration),
		setState('attack'),
	),
)

// ! Idle
export const idleNode: EnemyNode<['idle' | 'hit' | 'running'], ['idle']> = () => selector(
	sequence(
		enteringState('idle'),
		action((_e, _c, a) => a.playAnimation('idle')),
	),
	sequence(
		inState('idle'),
		condition((_e, c, _a) => c.canSeePlayer),
		setState('running'),
	),
)
// ! Hit
export const hitNode: EnemyNode<['idle' | 'hit' | 'dead'], ['hit']> = () => selector(
	sequence(
		enteringState('hit'),
		action(() => playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])),
		action((e, c) => {
			if (c.player) {
				// ! damage
				squish(e)
				flash(e, 200, 'damage')
				const [damage, crit] = calculateDamage(c.player)
				takeDamage(e, damage)
				e.enemyImpact?.restart()
				e.enemyImpact?.play()
				spawnDamageNumber(damage, e, crit)
				// ! knockBack
				const force = c.player.position.clone().sub(e.position).normalize().multiplyScalar(-50000)
				e.body.applyImpulse(force, true)
				// ! damage flash
			}
		}),
		action((_e, _c, a) => a.playOnce('hit')),
	),
	sequence(
		inState('hit'),
		waitFor((_e, _c, a) => !a.isPlaying('hit')),
		selector(
			sequence(
				condition(e => e.currentHealth > 0),
				setState('idle'),
			),
			sequence(
				condition(e => e.currentHealth <= 0),
				setState('dead'),
			),
		),

	),
)
// ! Running
export const runningNode: EnemyNode<['running', 'waitingAttack'], ['running']> = () => selector(
	sequence(
		enteringState('running'),
		action((_e, _c, a) => a.playAnimation('running')),
	),
	sequence(
		inState('running'),
		moveToDirection(),
		applyMove((_e, c) => c.force),
		applyRotate((_e, c) => c.force),

	),
)

// ! Attack
export const attackNode = (sounds: soundEffects[] = []): EnemyNode<['attack', 'attackCooldown', 'waitingAttack'], ['attacking']> => () => selector(
	sequence(
		inverter(inState('attack', 'waitingAttack', 'attackCooldown')),
		condition((...[e, { player }]) => {
			return player && getIntersections(e, undefined, c => c.handle === player.collider.handle)
		}),
		setState('waitingAttack'),
	),
	sequence(
		enteringState('attack'),
		action((_e, _c, a) => a.playOnce('attacking')),
		action(() => sounds.length > 0 && playSound(sounds)),
	),
	sequence(
		inState('attack'),
		applyRotate((_e, c) => c.force),
		applyMove((_e, c) => c.force.clone().multiplyScalar(0.5)),
		waitFor((_e, _c, a) => !a.isPlaying('attacking')),
		setState('attackCooldown'),
	),
)
// ! Attack Cooldown
export const attackCooldownNode = (delay: number, slowdown = 0.5): EnemyNode<['attackCooldown', 'idle'], ['running']> => () => selector(
	sequence(
		enteringState('attackCooldown'),
		action((_e, _c, a) => a.playAnimation('running')),
	),
	sequence(
		inState('attackCooldown'),
		moveToDirection(),
		applyRotate((_e, c) => c.force),
		applyMove((_e, c) => c.force.clone().multiplyScalar(slowdown)),
		wait('attackCooldown', delay),
		setState('idle'),
	),
)
// ! Dead
export const deadNode: EnemyNode<['dead'], ['dead']> = () => selector(
	sequence(
		enteringState('dead'),
		action((e) => {
			ecs.removeComponent(e, 'lockedOn')
			ecs.removeComponent(e, 'outline')
			selectNewLockedEnemy()
		}),
		action((_e, _c, a) => a.playClamped('dead')),
		action((e) => {
			if (e.enemyDefeated) {
				e.enemyDefeated.restart()
				e.enemyDefeated.play()
			}
			const mats = new Array<Material>()
			e.model.traverse((node) => {
				if (node instanceof Mesh) {
					node.castShadow = false
					const mat = node.material as InstanceType<typeof ToonMaterial>
					if (mat instanceof Material) {
						mat.transparent = true
						mat.depthWrite = false
						mats.push(mat)
					}
				}
			})
			tweens.add({
				destroy: e,
				from: 1,
				to: 0,
				duration: 2000,
				onUpdate: f => mats.forEach(m => m.opacity = f),
				onComplete: () => ecs.remove(e),
			})
		}),
	)
	,
	inState('dead'),
)
// ! STUN
export const stunNode: EnemyNode<['stun', 'attackCooldown'], ['hit']> = () => selector(
	sequence(
		enteringState('stun'),
		action((e, _c, a) => {
			ecs.update(e, stunBundle(e.size.y))
			a.playOnce('hit')
		}),
	),
	sequence(
		inverter(inState('stun')),
		action(e => ecs.removeComponent(e, 'stun')),
	),
	sequence(
		inState('stun'),
		wait('stun', 2000),
		moveToDirection(),
		setState('attackCooldown'),
	),
)
