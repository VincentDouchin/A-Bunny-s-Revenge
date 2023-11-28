import type { Animator } from './animator'
import type { ComponentsOfType } from './entity'
import { ecs, time } from './init'

export const playAnimations = (...components: ComponentsOfType<Animator<any>>[]) => components.map((component) => {
	const animationQuery = ecs.with(component)
	return () => {
		for (const entity of animationQuery) {
			entity[component].update(time.delta / 1000)
		}
	}
})
