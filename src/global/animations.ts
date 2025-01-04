import type { Animator } from './animator'
import type { ComponentsOfType } from './entity'
import { ecs, time } from './init'

export const updateAnimations = (...components: ComponentsOfType<Animator<any>>[]) => components.map((c) => {
	const query = ecs.with(c)
	return () => {
		for (const entity of query) {
			entity[c].update(time.delta / 1000)
		}
	}
})
