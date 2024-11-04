import type { Entity, States } from '@/global/entity'
import type { app } from '@/global/states'
import type { Query, With } from 'miniplex'
import type { Plugin } from './app'
import { ecs } from '@/global/init'
import { entries } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'

export type StateParameters<C extends keyof Entity> = (e: StateEntity<C>) => any
export type StateFn<C extends keyof Entity, B extends keyof States, F extends StateParameters<C>> = (
	e: StateEntity<C>,
	setState: (newState: States[B]) => void,
	decisions: ReturnType<F>
) => void

type StateEntity<C extends keyof Entity> = With<With<Entity, C>, 'behaviorController' | 'state'>

export interface EntityState<C extends keyof Entity, B extends keyof States, F extends StateParameters<C>> {
	(): {
		enter?: StateFn<C, B, F>
		update?: StateFn<C, B, F>
		exit?: StateFn<C, B, F>
	}
}

export const behaviorPlugin = <C extends keyof Entity, B extends keyof States, F extends StateParameters<C>>(
	initalQuery: Query<With<Entity, C>>,
	behaviorController: B,
	fn: F,
) => {
	const query = initalQuery.with('behaviorController', 'state').where(e => e.behaviorController === behaviorController)
	return (manager: Record<States[B], EntityState<C, B, F>>): Plugin<typeof app> => (app) => {
		for (const [entityState, stateManager] of entries(manager)) {
			const setState = (e: StateEntity<C>, previousState: States[B]) => (state: States[B]) => {
				if (e.state === previousState) {
					ecs.update(e, { state })
				}
			}
			const stateQuery = query.where(e => e.state === entityState)
			const { enter, update, exit } = stateManager()
			app.addSubscribers('game', () => stateQuery.onEntityAdded.subscribe((e) => {
				if (enter && app.isDisabled('paused')) {
					enter(e, setState(e, entityState), fn(e))
				}
			}))
			app.onPostUpdate('game', () => {
				if (update && app.isDisabled('paused')) {
					for (const entity of stateQuery) {
						update(entity, setState(entity, entityState), fn(entity))
					}
				}
			})
			app.addSubscribers('game', () => stateQuery.onEntityRemoved.subscribe(async (e) => {
				if (exit && app.isDisabled('paused')) {
					await sleep(1)
					exit(e, setState(e, entityState), fn(e))
				}
			}))
		}
	}
}

export const behaviorBundle = <B extends keyof States>(behaviorController: B, defaultState: States[B]) => ({
	behaviorController,
	state: defaultState,
} as const satisfies Entity)
