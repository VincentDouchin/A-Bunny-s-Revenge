import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { AdditiveBlending, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { Faction, states, States } from '@/global/entity'
import { assets, coroutines, ecs, tweens, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { inMap } from '@/lib/hierarchy'
import { pollenBundle } from '@/particles/pollenParticles'
import { projectileAttack } from '@/states/dungeon/attacks'
import { getIntersections } from '@/states/game/sensor'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, runNodes, selector, sequence, setState, wait, waitFor, withContext } from '../lib/behaviors'
import { applyMove, applyRotate, moveToDirection } from './behaviorHelpers'
import { attackCooldownNode, attackNode, damagedByPlayer, deadNode, enemyContext, hitNode, idleNode, runningNode, stunNode, waitingAttackNode } from './commonBehaviors'

export const baseEnemyQuery = ecs.with('movementForce', 'body', 'speed', 'rotation', 'position', 'group', 'strength', 'collider', 'model', 'currentHealth', 'size', 'hitTimer', 'targetRotation', 'sensor', 'state')

// ! Seedling
export const seedlingBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.pumpkinSeed), 'pumpkinSeedAnimator', 'melee'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.pumpkinSeedAnimator,
			selector(
				damagedByPlayer(),
				sequence(
					enteringState('spawn'),
					action(e => e.pumpkinSeedAnimator.playOnce('spawn', { timeScale: 0.5 })),
				),
				sequence(
					inState('spawn'),
					waitFor(e => !e.pumpkinSeedAnimator.isPlaying('spawn')),
					setState('idle'),
				),
				hitNode(),
				attackNode(['zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_010_47841', 'zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_013_47844', 'zapsplat_foley_tree_leaves_branch_whoosh_impact_designed_017_47848'])(),
				waitingAttackNode(300)(),
				attackCooldownNode(2000)(),
				idleNode(),
				runningNode(),
				deadNode(),
			),
		),
	),
)
// ! Range
export const rangeBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.enemy), 'enemyAnimator', 'range'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			selector(
				damagedByPlayer(),
				hitNode(),
				deadNode(),
				sequence(
					inverter(inState('attack', 'waitingAttack', 'attackCooldown')),
					condition((_e, c) => c.canShootPlayer && c.canSeePlayer),
					setState('waitingAttack'),
				),
				sequence(
					enteringState('attack'),
					applyRotate((_e, c) => c.force),
					action(e => projectileAttack(e, e.rotation.clone())),
					action(e => e.enemyAnimator.playOnce('attacking', { timeScale: 2 })),
					action(e => e.range.amount++),
				),
				sequence(
					inState('attack'),
					waitFor(e => !e.enemyAnimator.isPlaying('attacking')),
					selector(
						sequence(
							condition(e => e.range.amount === e.range.max),
							action(e => e.range.amount = 0),
							setState('attackCooldown'),
						),
						setState('waitingAttack'),
					),
				),
				idleNode(),
				runningNode(),
				waitingAttackNode(1000)(),
				attackCooldownNode(4000)(),
			),
		),
	),
)

// ! Melee
export const meleeBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.enemy), 'melee', 'enemyAnimator'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			selector(
				damagedByPlayer(),
				hitNode(),
				attackNode()(),
				idleNode(),
				runningNode(),
				waitingAttackNode(300)(),
				attackCooldownNode(2000)(),
				deadNode(),
			),
		),
	),
)
// ! Spore
export const sporeBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.enemy), 'spore', 'enemyAnimator'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			selector(
				damagedByPlayer(),
				hitNode(),
				sequence(
					inverter(inState('attack', 'waitingAttack', 'attackCooldown')),
					condition((e, c) => c.player && e.position.distanceTo(c.player.position) < 20),
					setState('waitingAttack'),
				),
				sequence(
					enteringState('attack'),
					action((e) => {
						e.enemyAnimator.playOnce('attacking')
						ecs.add(inMap({
							position: e.position.clone().add(new Vector3(0, 0, 15).applyQuaternion(e.rotation)),
							...pollenBundle(0xCFE0ED, 0xCFD1ED),
							sleepingPowder: true,
						}))
					}),
				),
				sequence(
					inState('attack'),
					applyRotate((_e, c) => c.force),
					applyMove((_e, c) => c.force.clone().multiplyScalar(0.5)),
					waitFor(e => !e.enemyAnimator.isPlaying('attacking')),
					setState('attackCooldown'),
				),
				idleNode(),
				runningNode(),
				waitingAttackNode(300)(),
				attackCooldownNode(2000)(),
				deadNode(),
			),
		),
	),
)
// ! Charging
const obstacleQuery = ecs.with('collider', 'obstacle', 'position')
export const chargingBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.enemy), 'charging', 'enemyAnimator', 'dashParticles'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			runNodes(
				damagedByPlayer(),
				hitNode(),
				stunNode(),
				idleNode(),
				runningNode(),
				waitingAttackNode(300)(),
				attackCooldownNode(2000)(),
				deadNode(),
				sequence(
					inState('running', 'idle'),
					condition((_e, c) => c.canSeePlayer),
					condition((e, c) => c.player && c.player.position.distanceTo(e.position) < 40),
					setState('waitingAttack'),
				),
				sequence(
					enteringState('attack'),
					action((e, _c, a) => {
						e.dashParticles.restart()
						e.dashParticles.play()
						a.playAnimation('running')
						e.charging.amount++
					}),
				),
				sequence(
					inState('attack'),
					applyRotate((_e, c) => c.force),
					applyMove((_e, c) => c.force.multiplyScalar(3.5)),
					action((e, { player }) => {
						world.contactPairsWith(e.collider, (c) => {
							for (const obstacle of obstacleQuery) {
								if (obstacle.collider === c && getIntersections(e) === c) {
									playSound('zapsplat_impacts_wood_rotten_tree_trunk_hit_break_crumple_011_102694')
									e.charging.amount = 0
									setState('stun')(e)
								}
							}
							if (player && c === player.collider) {
								e.charging.amount = 0
								setState('attackCooldown')(e)
							}
						})
					}),
					wait('attack', 800),
					selector(
						sequence(
							condition(e => e.charging.amount === e.charging.max),
							action(e => e.charging.amount = 0),
							setState('attackCooldown'),
						),
						setState('waitingAttack'),
					),
				),

			),
		),
	),
)
// ! Jumping
export const jumpingBehavior = createBehaviorTree(
	baseEnemyQuery.with(...states(States.enemy), 'jumping', 'enemyAnimator'),
	withContext(
		enemyContext,
		withContext(
			(...[e]) => e.enemyAnimator,
			selector(
				damagedByPlayer(),
				hitNode(),
				deadNode(),
				sequence(
					inverter(inState('attack', 'waitingAttack', 'attackCooldown')),
					condition((e, c) => c.player && e.position.distanceTo(c.player.position) < 20),
					setState('waitingAttack'),
				),
				sequence(
					enteringState('attack'),
					action((e, _c, a) => {
						a.playAnimation('idle')
						coroutines.add(function* () {
							while (e.position.y < 25) {
								e.movementForce.copy(new Vector3(0, 3, e.position.y / 10).applyQuaternion(e.targetRotation))
								yield
							}
							while (e.position.y > 5) {
								e.movementForce.copy(new Vector3(0, -3, 1).applyQuaternion(e.targetRotation))
								yield
							}

							setState('attackCooldown')(e)
							e.movementForce.copy(new Vector3(0, 0, 0))
							playSound('zapsplat_multimedia_game_sound_thump_hit_bubble_deep_underwater_88732')
							const impact = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ map: assets.textures.circle_01, transparent: true, blending: AdditiveBlending, depthWrite: false }))
							impact.rotateX(-Math.PI / 2)
							const impactEntity = ecs.add({
								model: impact,
								faction: Faction.Enemy,
								state: { current: 'attack', possible: [], previous: null, next: null },
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
					}),

				),
				sequence(
					inState('attack'),
					moveToDirection(),
					applyRotate((_e, c) => c.force),
					applyMove((_e, c) => c.force),
				),
				waitingAttackNode(300)(),
				attackCooldownNode(2000)(),
				idleNode(),
				runningNode(),

			),
		),
	),
)
