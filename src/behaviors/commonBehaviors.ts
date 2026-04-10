import type { With } from 'miniplex'
import type { Material } from 'three/webgpu'
import type { baseEnemyQuery } from './enemyBehavior'
import type { State } from './state'
import type { Animator } from '@/global/animator'
import type { AllAnimations, AllStates, AnimatorsWith, AssetNames, BehaviorNode, ComponentsOfType, Entity, QueryEntity, StatesWith } from '@/global/entity'
import { DEFAULT_QUERY_FILTER, findSmoothPath } from 'navcat'
import { Mesh, Vector3 } from 'three/webgpu'
import { Faction } from '@/global/entity'
import { assets, ecs, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { action, condition, enteringState, inState, selector, sequence, setState, wait, waitFor } from '@/lib/behaviors'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { ToonMaterial } from '@/shaders/toonMaterial'
import { calculateDamage, flash, squish } from '@/states/dungeon/battle'
import { selectNewLockedEnemy } from '@/states/dungeon/locking'
import { stunBundle } from '@/states/dungeon/stun'
import { getIntersections } from '@/states/game/sensor'
import { inverter } from '../lib/behaviors'
import { applyMove, applyRotate, getMovementForce, moveToDirection, takeDamage } from './behaviorHelpers'

export const playerQuery = ecs
	.with('position', 'strength', 'body', 'critChance', 'critDamage', 'playerAnimator', 'weapon', 'player', 'collider', 'sensor', 'rotation', 'playerAttackStyle', 'playerState')
	.where(({ faction }) => faction === Faction.Player)
// const navGridQuery = ecs.with('dungeon')
const getPlayerDirection = (e: QueryEntity<typeof baseEnemyQuery>, player: With<Entity, 'position'> | undefined) => {
	if (!player) return null
	const direction = new Vector3()
	// const direction = player.position.clone().sub(e.position).normalize()
	// const hit = world.castShape(e.position, e.rotation, direction, e.collider.shape, 1, 20, false, undefined, collisionGroups('any', ['obstacle', 'player']), undefined, undefined)
	// const obstacle = hit && hit?.collider !== player.collider
	// const canSeePlayer = player.position.distanceTo(e.position) < 70
	// if (obstacle) {
	const navMesh = assets.levels.dungeon_room_1.navMesh!

	const path = findSmoothPath(navMesh, e.position.toArray(), player.position.toArray(), [10, 1, 10], DEFAULT_QUERY_FILTER, 1, 0.1, 3)
	const point = path.path[1]
	if (point) {
		const direction = point ? new Vector3(point.position[0], 0, point.position[2]).sub(new Vector3(e.position.x, 0, e.position.z)).normalize() : null
		return {
			direction,
			canSeePlayer: true,
			canShootPlayer: false,
		}
	}
	return { direction, canSeePlayer: true, canShootPlayer: false }
}

export const enemyContext = <E extends QueryEntity<typeof baseEnemyQuery>>(entity: E) => {
	const player = playerQuery.first
	const playerData = getPlayerDirection(entity, player)
	const touchedByPlayer = !entity.hitTimer.running() && player && player.attacking && getIntersections(player) === entity.collider
	return { ...getMovementForce(entity), player, touchedByPlayer, ...playerData }
}

export const withContext =
	<S extends ComponentsOfType<State<any>>, A extends ComponentsOfType<Animator<any>>, E extends With<Entity, S | A>, C>(state: S, animator: A, context: (e: E) => C) =>
	(entity: E) => ({
		ctx: context(entity),
		entity,
		state: entity[state],
		animator: entity[animator],
	})

type EnemyNode<S extends AllStates[] = [], A extends AllAnimations[] = []> = <
	C extends { entity: QueryEntity<typeof baseEnemyQuery>; animator: AnimatorsWith<A>; state: StatesWith<S>; ctx: ReturnType<typeof enemyContext> },
>() => BehaviorNode<C>

// ! Damaged
export const damagedByPlayer: EnemyNode<['hit', 'dying', 'dead']> = () =>
	sequence(
		inverter(inState('dead', 'hit')),
		condition(({ ctx }) => ctx.touchedByPlayer),
		setState('hit'),
	)
// ! Waiting attack
export const waitingAttackNode =
	(duration: number): EnemyNode<['attack' | 'waitingAttack'], ['idle']> =>
	() =>
		selector(
			sequence(
				enteringState('waitingAttack'),
				action(({ animator }) => animator.playAnimation('idle')),
				action(({ entity }) => flash(entity, duration, 'preparing')),
				moveToDirection(),
			),
			sequence(inState('waitingAttack'), wait(duration)('waitingAttack'), setState('attack')),
		)

// ! Idle
export const idleNode: EnemyNode<['idle' | 'hit' | 'running'], ['idle']> = () =>
	selector(
		sequence(
			enteringState('idle'),
			action(({ animator }) => animator.playAnimation('idle')),
		),
		sequence(
			inState('idle'),
			condition(({ ctx }) => ctx.canSeePlayer),
			setState('running'),
		),
	)
// ! Hit
export const hitNode: EnemyNode<['idle' | 'hit' | 'dead'], ['hit']> = () =>
	selector(
		sequence(
			enteringState('hit'),
			action(() => playSound(['Hit_Metal_on_flesh', 'Hit_Metal_on_leather', 'Hit_Wood_on_flesh', 'Hit_Wood_on_leather'])),
			action(({ entity, ctx }) => {
				if (ctx.player) {
					// ! damage
					squish(entity)
					flash(entity, 200, 'damage')
					const [damage, crit] = calculateDamage(ctx.player)
					takeDamage(entity, damage * 2)
					// entity.enemyImpact?.restart()
					// entity.enemyImpact?.play()
					spawnDamageNumber(damage, entity, crit)
					// ! knockBack
					const force = ctx.player.position.clone().sub(entity.position).normalize().multiplyScalar(-50000)
					entity.body.applyImpulse(force, true)
					// ! damage flash
				}
			}),
			action(({ animator }) => animator.playOnce('hit')),
		),
		sequence(
			inState('hit'),
			waitFor(({ animator }) => !animator.isPlaying('hit')),
			selector(
				sequence(
					condition(({ entity }) => entity.currentHealth > 0),
					setState('idle'),
				),
				sequence(
					condition(({ entity }) => entity.currentHealth <= 0),
					setState('dead'),
				),
			),
		),
	)
// ! Running
export const runningNode: EnemyNode<['running' | 'waitingAttack'], ['running']> = () =>
	selector(
		sequence(
			enteringState('running'),
			action(({ animator }) => animator.playAnimation('running')),
		),
		sequence(
			inState('running'),
			moveToDirection(),
			applyMove(({ ctx }) => ctx.force),
			applyRotate(({ ctx }) => ctx.force),
		),
	)

// ! Attack

export const attackNode =
	(sounds: AssetNames['soundEffects'][] = []): EnemyNode<['attack', 'cooldown', 'waitingAttack'], ['attacking']> =>
	() =>
		selector(
			sequence(
				inverter(inState('attack', 'cooldown', 'waitingAttack')),
				condition(({ entity, ctx }) => {
					return ctx.player && getIntersections(entity, undefined, (c) => c.handle === ctx.player?.collider.handle)
				}),
				setState('waitingAttack'),
			),
			sequence(
				enteringState('attack'),
				action(({ animator }) => animator.playOnce('attacking')),
				action(() => sounds.length > 0 && playSound(sounds)),
			),
			sequence(
				inState('attack'),
				applyRotate(({ ctx }) => ctx.force),
				applyMove(({ ctx }) => ctx.force.clone().multiplyScalar(0.5)),
				waitFor(({ animator }) => !animator.isPlaying('attacking')),
				setState('cooldown'),
			),
		)
// ! Attack Cooldown
export const cooldownNode =
	(delay: number, slowdown = 0.5): EnemyNode<['cooldown' | 'idle'], ['running']> =>
	() =>
		selector(
			sequence(
				enteringState('cooldown'),
				action(({ animator }) => animator.playAnimation('running')),
			),
			sequence(
				inState('cooldown'),
				moveToDirection(),
				applyRotate(({ ctx }) => ctx.force),
				applyMove(({ ctx }) => ctx.force.clone().multiplyScalar(slowdown)),
				wait(delay)('cooldown'),
				setState('idle'),
			),
		)
// ! Dead
export const deadNode: EnemyNode<['dead'], ['dead']> = () =>
	selector(
		sequence(
			enteringState('dead'),
			action(({ entity }) => {
				ecs.removeComponent(entity, 'lockedOn')
				ecs.removeComponent(entity, 'outline')
				selectNewLockedEnemy()
			}),
			action(({ animator }) => animator.playClamped('dead')),
			action(({ entity }) => {
				if (entity.enemyDefeatedParticles) {
					entity.enemyDefeatedParticles.start()
				}
				const mats = new Array<Material>()
				entity.model.traverse((node) => {
					if (node instanceof Mesh) {
						node.castShadow = false
						if (node.material instanceof ToonMaterial) {
							node.material.transparent = true
							node.material.depthWrite = false
							mats.push(node.material)
						}
					}
				})

				tweens.add({
					onComplete: () => entity.enemyDefeatedParticles?.stop(),
					duration: 500,
				})
				tweens.add({
					destroy: entity,
					from: 1,
					to: 0,
					duration: 2000,
					onUpdate: (f) => {
						mats.forEach((m) => {
							m.opacity = f
							m.needsUpdate = true
						})
					},
				})
			}),
		),
		inState('dead'),
	)
// ! STUN
export const stunNode: EnemyNode<['cooldown', 'stun'], ['hit']> = () =>
	selector(
		sequence(
			enteringState('stun'),
			action(({ animator, entity }) => {
				ecs.update(entity, stunBundle(entity.size.y))
				animator.playOnce('hit')
			}),
		),
		sequence(
			inState('stun'),
			condition(({ entity }) => 'stun' in entity),
			action(({ entity }) => ecs.removeComponent(entity, 'stun')),
		),
		sequence(inState('stun'), wait(2000)('stun'), moveToDirection(), setState('cooldown')),
	)
