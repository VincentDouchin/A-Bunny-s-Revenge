import type { Entity, states } from '@/global/entity'
import { ecs } from '@/global/init'

export class StateMachine<S extends states> {
	#state: S
	transitions: Partial<Record<S, S[]>> = {}
	constructor(initialState: S, transitions: Partial<Record<S, S[]>>) {
		this.#state = initialState
		this.transitions = transitions
	}

	enter(newState: S, entity: Entity) {
		if (!(newState in this.transitions) || this.transitions[this.#state]?.includes(newState)) {
			ecs.update(entity, { state: newState })
			this.#state = newState
			return true
		}
		return false
	}
}
export const stateBundle = <S extends states>(initialState: S, transitions: Record<S, S[]>) => ({
	state: initialState,
	stateMachine: new StateMachine(initialState, transitions),
} as const satisfies Entity)