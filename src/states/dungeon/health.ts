import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'

export const healthBundle = (health: number) => ({
	currentHealth: health,
	maxHealth: health,
} as const satisfies Entity)

const healthQuery = ecs.with('currentHealth', 'maxHealth')
export const killEntities = () => {
	for (const entity of healthQuery) {
		if (entity.currentHealth === 0) {
			ecs.remove(entity)
		}
	}
}