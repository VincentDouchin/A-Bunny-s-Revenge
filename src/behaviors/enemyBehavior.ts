import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { AdditiveBlending, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { Faction } from '@/global/entity'
import { assets, coroutines, ecs, tweens, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { pollenBundle } from '@/particles/pollenParticles'
import { projectileAttack } from '@/states/dungeon/attacks'
import { getIntersections } from '@/states/game/sensor'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, selector, sequence, setState, wait, waitFor } from '../lib/behaviors'
import { applyMove, applyRotate, moveToDirection } from './behaviorHelpers'
import { attackNode, cooldownNode, damagedByPlayer, deadNode, enemyContext, hitNode, idleNode, runningNode, stunNode, waitingAttackNode, withContext } from './commonBehaviors'

export const baseEnemyQuery = ecs.with('movementForce', 'body', 'speed', 'rotation', 'position', 'group', 'strength', 'collider', 'model', 'currentHealth', 'size', 'hitTimer', 'targetRotation', 'sensor')

// ! Seedling
export const seedlingBehavior = createBehaviorTree(
	baseEnemyQuery.with('pumpkinSeedState', 'pumpkinSeedAnimator', 'melee'),
	withContext('pumpkinSeedState', 'pumpkinSeedAnimator', enemyContext),
	selector(
		deadNode(),
		damagedByPlayer(),
		hitNode(),
		idleNode(),
		runningNode(),
		waitingAttackNode(300)(),
		cooldownNode(2000)(),
		sequence(
			enteringState('spawn'),
			action(({ animator }) => animator.playOnce('spawn', { timeScale: 0.5 })),
		),
		sequence(
			inState('spawn'),
			waitFor(({ animator }) => !animator.isPlaying('spawn')),
			setState('idle'),
		),

		attackNode([
			'zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_010_47841',
			'zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_013_47844',
			'zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_017_47848',
		])(),

	),
)
// ! Range
export const rangeBehavior = createBehaviorTree(
	baseEnemyQuery.with('enemyState', 'enemyAnimator', 'range'),
	withContext('enemyState', 'enemyAnimator', enemyContext),
	selector(
		deadNode(),
		hitNode(),
		damagedByPlayer(),
		sequence(
			inverter(inState('attack', 'waitingAttack', 'cooldown')),
			condition(({ ctx }) => ctx.canShootPlayer && ctx.canSeePlayer),
			setState('waitingAttack'),
		),
		runningNode(),
		idleNode(),
		waitingAttackNode(1000)(),
		cooldownNode(4000)(),
		sequence(
			enteringState('attack'),
			applyRotate(({ ctx }) => ctx.force),
			action(({ entity }) => projectileAttack(entity, entity.rotation.clone())),
			action(({ animator }) => animator.playOnce('attacking', { timeScale: 2 })),
			action(({ entity }) => entity.range.amount++),
		),
		sequence(
			inState('attack'),
			waitFor(({ animator }) => !animator.isPlaying('attacking')),
			selector(
				sequence(
					condition(({ entity }) => entity.range.amount === entity.range.max),
					action(({ entity }) => entity.range.amount = 0),
					setState('cooldown'),
				),
				setState('waitingAttack'),
			),
		),

	),
)

// ! Melee
export const meleeBehavior = createBehaviorTree(
	baseEnemyQuery.with('enemyState', 'melee', 'enemyAnimator'),
	withContext('enemyState', 'enemyAnimator', enemyContext),
	selector(
		deadNode(),
		hitNode(),
		damagedByPlayer(),
		waitingAttackNode(300)(),
		cooldownNode(2000)(),
		attackNode()(),
		runningNode(),
		idleNode(),
	),
)
// ! Spore
export const sporeBehavior = createBehaviorTree(
	baseEnemyQuery.with('enemyState', 'spore', 'enemyAnimator'),
	withContext('enemyState', 'enemyAnimator', enemyContext),
	selector(
		deadNode(),
		damagedByPlayer(),
		hitNode(),
		waitingAttackNode(300)(),
		cooldownNode(2000)(),
		sequence(
			inverter(inState('attack', 'waitingAttack', 'cooldown')),
			condition(({ entity, ctx }) => ctx.player && entity.position.distanceTo(ctx.player.position) < 20),
			setState('waitingAttack'),
		),
		sequence(
			enteringState('attack'),
			action(({ animator, entity }) => {
				animator.playOnce('attacking')
				ecs.add(inMap({
					position: entity.position.clone().add(new Vector3(0, 0, 15).applyQuaternion(entity.rotation)),
					...pollenBundle(0xCFE0ED, 0xCFD1ED),
					sleepingPowder: true,
				}))
			}),
		),
		sequence(
			inState('attack'),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force.clone().multiplyScalar(0.5)),
			waitFor(({ entity }) => !entity.enemyAnimator.isPlaying('attacking')),
			setState('cooldown'),
		),
		idleNode(),
		runningNode(),
	),
)
// ! Charging
const obstacleQuery = ecs.with('collider', 'obstacle', 'position')
export const chargingBehavior = createBehaviorTree(
	baseEnemyQuery.with('enemyState', 'charging', 'enemyAnimator', 'dashParticles'),
	withContext('enemyState', 'enemyAnimator', enemyContext),

	selector(
		deadNode(),
		hitNode(),
		damagedByPlayer(),
		stunNode(),
		waitingAttackNode(300)(),
		cooldownNode(2000)(),
		sequence(
			enteringState('attack'),
			action(({ entity, animator }) => {
				entity.dashParticles.restart()
				entity.dashParticles.play()
				animator.playAnimation('running')
				entity.charging.amount++
			}),
		),
		sequence(
			inState('attack'),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force.multiplyScalar(3.5)),
			action(({ entity, ctx, state }) => {
				world.contactPairsWith(entity.collider, (c) => {
					for (const obstacle of obstacleQuery) {
						if (obstacle.collider === c && getIntersections(entity) === c) {
							playSound('zapsplat_impacts_wood_rotten_tree_trunk_hit_break_crumple_011_102694')
							entity.charging.amount = 0
							setState('stun')({ state })
						}
					}
					if (ctx.player && c === ctx.player.collider) {
						entity.charging.amount = 0
						setState('cooldown')({ state })
					}
				})
			}),
			wait(800)('attack'),
			selector(
				sequence(
					condition(({ entity }) => entity.charging.amount === entity.charging.max),
					action(({ entity }) => entity.charging.amount = 0),
					setState('cooldown'),
				),
				setState('waitingAttack'),
			),
		),

		sequence(
			inState('running'),
			condition(({ ctx }) => ctx.canSeePlayer),
			condition(({ entity, ctx, animator: _a }) => ctx.player && ctx.player.position.distanceTo(entity.position) < 40),
			setState('waitingAttack'),
		),
		runningNode(),
		idleNode(),

	),
)
// ! Jumping
const impactMaterial = new MeshBasicMaterial({ map: assets.textures.circle_01, transparent: true, blending: AdditiveBlending, depthWrite: false })

export const jumpingBehavior = createBehaviorTree(
	baseEnemyQuery.with('enemyState', 'jumping', 'enemyAnimator'),
	withContext('enemyState', 'enemyAnimator', enemyContext),
	selector(
		deadNode(),
		hitNode(),
		damagedByPlayer(),
		sequence(
			inverter(inState('attack', 'waitingAttack', 'cooldown')),
			condition(({ entity, ctx }) => ctx.player && entity.position.distanceTo(ctx.player.position) < 20),
			setState('waitingAttack'),
		),
		sequence(
			enteringState('attack'),
			applyRotate(({ ctx }) => ctx.force),
			action(({ entity, animator, state }) => {
				animator.playAnimation('idle')
				coroutines.add(function* () {
					while (entity.position.y < 25) {
						entity.movementForce.copy(new Vector3(0, 3, entity.position.y / 10).applyQuaternion(entity.targetRotation))
						yield
					}
					while (entity.position.y > 5) {
						entity.movementForce.copy(new Vector3(0, -3, 1).applyQuaternion(entity.targetRotation))
						yield
					}

					setState('cooldown')({ state })
					entity.movementForce.copy(new Vector3(0, 0, 0))
					playSound('zapsplat_multimedia_game_sound_thump_hit_bubble_deep_underwater_88732')
					const impact = new Mesh(new PlaneGeometry(2, 2), impactMaterial)
					impact.rotateX(-Math.PI / 2)
					const impactEntity = ecs.add(inMap({
						model: impact,
						faction: Faction.Enemy,
						attacking: true,
						bodyDesc: RigidBodyDesc.fixed(),
						strength: entity.strength,
						colliderDesc: ColliderDesc.cylinder(1, 1).setSensor(true),
						position: entity.position.clone(),
					}))
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
			}),

		),
		sequence(
			inState('attack'),
			moveToDirection(),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force),
		),
		waitingAttackNode(300)(),
		cooldownNode(2000)(),
		idleNode(),
		runningNode(),

	),
)

// ! Mushroom

export const mushroomBehavior = createBehaviorTree(
	baseEnemyQuery.with('mushroomState', 'mushroom', 'enemyAnimator'),
	withContext('mushroomState', 'enemyAnimator', enemyContext),
	selector(
		deadNode(),
		hitNode(),
		damagedByPlayer(),
		waitingAttackNode(100)(),
		cooldownNode(500)(),

		sequence(
			enteringState('attack'),
			action(({ animator }) => animator.playOnce('attacking')),
		),
		sequence(
			inState('attack'),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force.clone().multiplyScalar(0.5)),
			waitFor(({ animator }) => !animator.isPlaying('attacking')),
			setState('cooldown'),
		),
		sequence(
			condition(({ ctx, entity }) => ctx.player && ctx.player.position.distanceTo(entity.position) < 10),
			setState('waitingAttack'),
		),
		sequence(
			inState('escape'),
			condition(({ ctx }) => ctx.canSeePlayer),
			setState('runaway'),
		),
		sequence(
			enteringState('runaway'),
			action(({ animator }) => animator.playAnimation('running')),
		),
		sequence(
			inState('runaway'),
			action(({ ctx, entity }) => {
				if (ctx.direction && ctx.player) {
					ctx.direction?.negate()
					const hit =	world.castShape(entity.position, entity.rotation, ctx.direction, entity.collider.shape, 1, 20, false, undefined, collisionGroups('enemy', ['obstacle']), undefined, undefined)
					if (hit) {
						ctx.direction = ctx.direction.normalize().reflect(new Vector3().copy(hit.normal1).normalize()).normalize()
					}
				}
			}),
			moveToDirection(),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force),
		),
		idleNode(),
		runningNode(),
	),
)