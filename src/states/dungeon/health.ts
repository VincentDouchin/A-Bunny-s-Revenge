import { Tween } from '@tweenjs/tween.js'
import { Mesh } from 'three'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import { addTag } from '@/lib/hierarchy'

export const healthBundle = (health: number) => ({
	currentHealth: health,
	maxHealth: health,
} as const satisfies Entity)

const healthQuery = ecs.with('currentHealth', 'maxHealth')
const needToDieQuery = healthQuery.without('dying')
const dyingQuery = ecs.with('dying', 'animator', 'model')
export const killEntities = () => {
	for (const entity of needToDieQuery) {
		if (entity.currentHealth <= 0) {
			addTag(entity, 'dying')
		}
	}
}
export const killAnimation = () => dyingQuery.onEntityAdded.subscribe((entity) => {
	ecs.removeComponent(entity, 'movementForce')
	ecs.removeComponent(entity, 'body')
	entity.animator.playOnce('Death', false)?.then(() => {
		const tween = new Tween({ opacity: 1 }).to({ opacity: 0 }, 500)
			.onComplete(() => {
				ecs.remove(entity)
			})
		entity.model.traverse((node) => {
			if (node instanceof Mesh && node.material) {
				node.material.transparent = true
				tween.onUpdate(({ opacity }) => node.material.opacity = opacity)
			}
		})
		ecs.update(entity, { tween })
	})
})