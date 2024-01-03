import { ecs, time } from './init'

const animationQuery = ecs.with('animator')
export const playAnimations = () => {
	for (const entity of animationQuery) {
		entity.animator.update(time.delta / 1000)
	}
}
