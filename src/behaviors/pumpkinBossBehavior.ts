import { ecs } from '@/global/init'
import { behaviorPlugin } from '@/lib/behaviors'
import { getIntersections } from '@/states/game/sensor'
import { getMovementForce } from './behaviorHelpers'
import { playerQuery } from './enemyBehavior'

const pumpkinBossBossQuery = ecs
	.with('boss', 'movementForce', 'speed', 'position', 'rotation', 'body', 'enemyAnimator', 'group', 'collider', 'currentHealth', 'maxHealth', 'model', 'strength', 'hitTimer', 'size', 'targetRotation', 'pumpkinBoss')
export const pumpkinBossBehaviorPlugin = behaviorPlugin(
	pumpkinBossBossQuery,
	'pumpkinBoss',
	(e) => {
		const player = playerQuery.first
		const direction = player ? player.position.clone().sub(e.position).normalize() : null
		const touchedByPlayer = !e.hitTimer.running() && player && player.state === 'attack' && getIntersections(player, undefined, c => c === e.collider)
		return { ...getMovementForce(e), player, direction, touchedByPlayer }
	},
)({
	idle: () => ({}),
	running: () => ({}),
	summon: () => ({}),
	underground: () => ({}),
})