import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import { Stat } from '@/lib/stats'

export const healthBundle = (health: number, current?: number) => ({
	currentHealth: current ?? health,
	maxHealth: new Stat(health),
} as const satisfies Entity)

const healthQuery = ecs.with('currentHealth', 'maxHealth', 'state')

export const setInitialHealth = () => {
	for (const entity of healthQuery) {
		entity.currentHealth = entity.maxHealth.value
	}
}
