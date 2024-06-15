import type { Animator } from './animator'
import type { AllComponentsOfType } from './entity'
import { ecs, time } from './init'
import { set } from '@/lib/state'

export const updateAnimations = (...components: AllComponentsOfType<Animator<any>>) => set(components.map((c) => {
	const query = ecs.with(c)
	return () => {
		for (const entity of query) {
			entity[c].update(time.delta / 1000)
		}
	}
}))
