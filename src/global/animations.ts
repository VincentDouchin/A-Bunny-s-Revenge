import type { Animator } from './animator'
import type { ComponentsOfType } from './entity'
import { ecs, time } from './init'
import { set } from '@/lib/state'

// const animationQuery = ecs.with('animator')
// export const playAnimations = () => {
// 	for (const entity of animationQuery) {
// 		entity.animator.update(time.delta / 1000)
// 	}
// }
export const updateAnimations = (...components: ComponentsOfType<Animator<any>>[]) => set(components.map((c) => {
	const query = ecs.with(c)
	return () => {
		for (const entity of query) {
			entity[c].update(time.delta / 1000)
		}
	}
}))