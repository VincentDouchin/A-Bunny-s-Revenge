import type { Query } from 'miniplex'
import type { State } from './state'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'

const updateAndApply = <T extends Entity>(query: Query<T>, fn: (entity: T) => void) => {
	return (state: State) => {
		state.addSubscribers(() => query.onEntityAdded.subscribe(fn))
		state.onUpdate(() => {
			for (const entity of query) {
				fn(entity)
			}
		})
	}
}

export const updateModels = (state: State) => {
	updateAndApply(ecs.with('scale', 'group'), (entity) => {
		entity.group.scale.set(entity.scale, entity.scale, entity.scale)
	})(state)
}