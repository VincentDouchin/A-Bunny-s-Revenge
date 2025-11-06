import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import { between } from 'randomish'
import { ecs } from '@/global/init'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, selector, sequence, setState, waitFor } from '@/lib/behaviors'
import { honeyProjectile, pollenAttack, projectilesCircleAttack } from '@/states/dungeon/attacks'
import { getIntersections } from '@/states/game/sensor'
import { getRandom } from '@/utils/mapFunctions'
import { applyMove, applyRotate } from './behaviorHelpers'
import { cooldownNode, damagedByPlayer, deadNode, enemyContext, hitNode, idleNode, runningNode, waitingAttackNode, withContext } from './commonBehaviors'
import { baseEnemyQuery } from './enemyBehavior'

const pollenQuery = ecs.with('pollen')

const rangedAttacks = (e: With<Entity, 'group' | 'rotation' | 'strength'>) => getRandom(pollenQuery.size > 5
	? [honeyProjectile, projectilesCircleAttack]
	: [pollenAttack, honeyProjectile, projectilesCircleAttack])(e)

export const beeBossBehavior = createBehaviorTree(
	baseEnemyQuery.with('boss', 'enemyAnimator', 'beeBoss', 'beeBossState'),
	withContext('beeBossState', 'enemyAnimator', enemyContext),
	selector(
		damagedByPlayer(),
		deadNode(),
		hitNode(),
		sequence(
			inverter(inState('attack', 'waitingAttack', 'cooldown')),
			condition(({ entity, ctx }) => {
				return ctx.player && getIntersections(entity, undefined, c => c.handle === ctx.player?.collider.handle)
			}),
			setState('waitingAttack'),
		),
		sequence(
			enteringState('rangeAttack'),
			action(({ entity }) => rangedAttacks(entity)),
		),

		sequence(
			enteringState('attack'),
			action(({ animator }) => animator.playOnce('attacking')),
			selector(
				sequence(
					condition(({ entity, ctx }) => ctx.player && ctx.player.position.distanceTo(entity.position) > 20),
					setState('rangeAttack'),
				),
			),
		),
		sequence(
			inState('attack', 'rangeAttack'),
			applyRotate(({ ctx }) => ctx.force),
			applyMove(({ ctx }) => ctx.force.clone().multiplyScalar(0)),
			waitFor(({ animator }) => !animator.isPlaying('attacking')),
			setState('cooldown'),
		),

		idleNode(),
		runningNode(),
		waitingAttackNode(300)(),
		cooldownNode(between(1_000, 3_000), 0.8)(),

	),
)
