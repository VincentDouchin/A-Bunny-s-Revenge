import { ecs, time } from '@/global/init'

export const SCALE = 10
export const HEIGHT = 240

const withTimeUniformQuery = ecs.with('withTimeUniform')
export const updateTimeUniforms = () => {
	for (const entity of withTimeUniformQuery) {
		entity.withTimeUniform(time.elapsed / 1000)
	}
}
