import type { AllStates, BehaviorNode, Entity } from '@/global/entity'
import type { app } from '@/global/states'
import type { Query, With } from 'miniplex'
import { ecs, time } from '@/global/init'
import { type Plugin, runIf } from './app'

export const sequence = <E extends Array<any>>(...nodes: BehaviorNode<E>[]): BehaviorNode<E> => (...e) => {
	for (const node of nodes) {
		const status = node(...e)
		if (status !== 'success') {
			return status
		}
	}
	return 'success'
}

export const selector = <E extends Array<any>>(...nodes: BehaviorNode<E>[]): BehaviorNode<E> => (...e) => {
	for (const node of nodes) {
		const status = node(...e)
		if (status !== 'failure') {
			return status
		}
	}
	return 'failure'
}

export const parallel = <E extends Array<any>>(...nodes: BehaviorNode<E>[]): BehaviorNode<E> => (...e) => {
	for (const node of nodes) {
		const status = node(...e)
		if (status !== 'success') {
			break
		}
	}
	return 'success'
}

export const runNodes = <E extends Array<any>>(...nodes: BehaviorNode<E>[]): BehaviorNode<E> => (...e) => {
	for (const node of nodes) {
		node(...e)
	}
	return 'success'
}

export const inverter = <E extends Array<any>>(node: BehaviorNode<E>): BehaviorNode<E> => (...e) => {
	const status = node(...e)
	switch (status) {
		case 'success': return 'failure'
		case 'failure': return 'success'
		case 'running': return 'running'
	}
}

export const condition = <E extends Array<any>>(check: (...e: E) => any) => (...entity: E) => check(...entity) ? 'success' : 'failure'
export const action = <E extends Array<any>>(execute: (...e: E) => any) => (...entity: E) => (execute(...entity) === false) ? 'failure' : 'success'
export const ifElse = <E extends Array<any>>(
	conditionNode: BehaviorNode<E>,
	successNode: BehaviorNode<E>,
	failureNode: BehaviorNode<E>,
): BehaviorNode<E> => (...e) => {
	return conditionNode(...e) === 'success'
		? successNode(...e)
		: failureNode(...e)
}

export const updateState = (e: With<Entity, 'state'>) => {
	e.state.previous = e.state.current
	if (e.state.next !== null) {
		e.state.current = e.state.next
		e.state.next = null
		ecs.reindex(e)
	}
}
export const createBehaviorTree = <E extends With<Entity, 'state'>>(
	query: Query<E>,
	tree: BehaviorNode<[E]>,
): Plugin<typeof app> => (app) => {
	app.onUpdate('game', runIf(() => app.isDisabled('paused') && app.isDisabled('menu'), () => {
		for (const e of query) {
			tree(e)
			updateState(e)
		}
	}))
}

type StateFunction = <S extends AllStates, E extends With<Entity, 'state'> & With<Entity, `${S}State`>, C extends Array<any>>(state: S) => BehaviorNode<[E, ...C]>

export const inState = <S extends AllStates[], E extends Pick<Required<Entity>, 'state' | `${S[number]}State`>, C extends Array<any>>(...state: S) => condition<[E, ...C]>((...[e]) => {
	return state.includes(e.state.current)
})

export const exitingState: StateFunction = state => condition((...[e]) => e.state.previous === state && e.state.current !== state)

export const setState: StateFunction = state => action((...[e]) => e.state.next = state)

export const enteringState: StateFunction = state => condition((...[e]) => e.state.current !== e.state.previous && e.state.current === state)

export const withContext = <E extends Array<any>, C>(
	contextFn: (...e: E) => C,
	node: BehaviorNode<[...E, C]>,
): BehaviorNode<E> => (...e: E) => {
	const context = contextFn(...e)
	return node(...e, context)
}

export const wait = (state: AllStates, duration: number) => <
	E extends With<Entity, 'state'>,
	R extends Array<any>,
>(...[e]: [E, ...R]) => {
	if (e.wait?.state === e.state.current) {
		e.wait.duration -= time.delta
		if (e.wait.duration <= 0) {
			ecs.removeComponent(e, 'wait')
			return 'success'
		}
	} else {
		ecs.removeComponent(e, 'wait')
		ecs.update(e, { wait: { state, duration } })
	}
	return 'running'
}
export const waitFor = <R extends any[]>(fn: (...args: R) => boolean): BehaviorNode<R> => (...args: R) => fn(...args) ? 'success' : 'running'

export const alwaysFail = <R extends any[]>(): BehaviorNode<R> => () => 'failure'
export const alwaysSucceed = <R extends any[]>(): BehaviorNode<R> => () => 'success'