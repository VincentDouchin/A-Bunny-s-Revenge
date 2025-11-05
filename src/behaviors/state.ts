import type { ComponentsOfType } from '@/global/entity'
import { ecs } from '@/global/init'
import { addTag } from '@/lib/hierarchy'

export class State<K extends string> {
	current: K
	previous: K | null = null
	next: K | null = null
	wait: { state: K, duration: number } | null = null
	constructor(defaultState: K) {
		this.current = defaultState
	}
}

export const updateStates = (...states: ComponentsOfType<State<any>>[]) => {
	return states.map((state) => {
		const query = ecs.with(state)
		return () => {
			for (const entity of query) {
				entity[state].previous = entity[state].current

				if (entity[state].next !== null) {
					if (entity[state].next.startsWith('attack')) {
						addTag(entity, 'attacking')
					}
					entity[state].current = entity[state].next
					entity[state].next = null
				}
				if (entity[state].previous.startsWith('attack') && !entity[state].current.startsWith('attack')) {
					ecs.removeComponent(entity, 'attacking')
				}
			}
		}
	})
}