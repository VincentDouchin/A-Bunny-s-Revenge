import type { Query } from 'miniplex'
import type { State } from '@/behaviors/state'
import type { AllStates, BehaviorNode, Entity, StatesWith } from '@/global/entity'
import { time } from '@/global/init'

type NodeProcessor = <E>(...nodes: BehaviorNode<E>[]) => BehaviorNode<E>

export const sequence: NodeProcessor = (...nodes) => (e) => {
	for (const node of nodes) {
		const status = node(e)
		if (status !== 'success') {
			return status
		}
	}
	return 'success'
}

export const selector: NodeProcessor = (...nodes) => (e) => {
	for (const node of nodes) {
		const status = node(e)
		if (status !== 'failure') {
			return status
		}
	}
	return 'failure'
}

export const parallel: NodeProcessor = (...nodes) => (e) => {
	for (const node of nodes) {
		const status = node(e)
		if (status !== 'success') {
			break
		}
	}
	return 'success'
}

export const runNodes: NodeProcessor = (...nodes) => (e) => {
	for (const node of nodes) {
		node(e)
	}
	return 'success'
}

export const inverter: NodeProcessor = node => (e) => {
	const status = node(e)
	switch (status) {
		case 'success': return 'failure'
		case 'failure': return 'success'
		case 'running': return 'running'
	}
}

export const condition = <E>(check: (e: E) => any): BehaviorNode<E> => entity => check(entity) ? 'success' : 'failure'
export const action = <E>(execute: (e: E) => any): BehaviorNode<E> => entity => (execute(entity) === false) ? 'failure' : 'success'
export const ifElse = <E>(
	conditionNode: BehaviorNode<E>,
	successNode: BehaviorNode<E>,
	failureNode: BehaviorNode<E>,
): BehaviorNode<E> => (...e) => {
	return conditionNode(...e) === 'success'
		? successNode(...e)
		: failureNode(...e)
}

export const createBehaviorTree = <E extends Entity, C>(
	query: Query<E>,
	context: (entity: E) => C,
	tree: BehaviorNode<C>,
) => () => {
	for (const entity of query) {
		tree(context(entity))
	}
}

type StateFunction = <S extends AllStates[], R>(...state: S) => BehaviorNode<R & { state: StatesWith<S> }>

export const inState: StateFunction = (...states) => condition(({ state: stateComponent }) => states.includes(stateComponent.current))

export const exitingState: StateFunction = (...[exitState]) => condition(({ state }) => state.previous === exitState && state.current !== exitState)

export const setState: StateFunction = (...[newState]) => action(({ state }) => state.next = newState)

export const enteringState: StateFunction = (...[enterState]) => condition(({ state }) => state.current !== state.previous && state.current === enterState)

export const wait = (duration: number): StateFunction => (...[state]) => ({ state: stateComponent }) => {
	if (stateComponent.wait?.state === stateComponent.current) {
		stateComponent.wait.duration -= time.delta
		if (stateComponent.wait.duration <= 0) {
			stateComponent.wait = null
			return 'success'
		}
	} else {
		(stateComponent as State<any>).wait = { state, duration }
	}
	return 'running'
}
export const waitFor = <R>(fn: (args: R) => boolean): BehaviorNode<R> => (args: R) => fn(args) ? 'success' : 'running'

export const alwaysFail = <R>(): BehaviorNode<R> => () => 'failure'
export const alwaysSucceed = <R>(): BehaviorNode<R> => () => 'success'