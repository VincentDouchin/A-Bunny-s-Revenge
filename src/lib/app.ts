// export type Commands<A extends App<any, any>> = A extends App<infer States, infer Ressources> ? {
// 	enable: <S extends States[number]>(...args: S extends keyof Ressources ? [S, Ressources[S]] : [S]) => Promise<void>
// 	disable: (state: States[number]) => Promise<void>
// 	isEnabled: (state: States[number]) => boolean
// 	isDisabled: (state: States[number]) => boolean
// } : never

export type AppStates<A extends App<any, any>> = A extends App<infer States, any> ? States[number] : never

// type ConditionSystem<A extends App<any, any>, S extends AppStates<A> | undefined = undefined> = A extends App<any, infer Ressources>
// 	? (ressources: S extends keyof Ressources ? Ressources[S] : undefined) => boolean
// 	: never

export type UpdateSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Ressources>
	? (ressources: S extends keyof Ressources ? Ressources[S] : void) => void
	: never

export type TransitionSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Ressources>
	? (ressources: S extends keyof Ressources ? Ressources[S] : void) => Promise<void> | void
	: never

export type SubscriberSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Ressources>
	? (ressources: S extends keyof Ressources ? Ressources[S] : void) => () => void
	: never

type Systems<A extends App<any, any>> = {
	[S in AppStates<A>]?: {
		subscribers: Set<SubscriberSystem<A, S>>
		enter: Set<TransitionSystem<A, S>>
		exit: Set<TransitionSystem<A, S>>
		preUpdate: Set<UpdateSystem<A, S>>
		update: Set<UpdateSystem<A, S>>
		postUpdate: Set<UpdateSystem<A, S>>
		cleanUp: Set<() => void>
	}
}
export type Ressources<A extends App<any, any>, S extends AppStates<A>> = A extends App<any, infer R>
	? R[S]
	: never

type Schedule = 'enter' | 'preUpdate' | 'update' | 'postUpdate' | 'exit'
export type Plugin<A extends App<any, any>> = (app: A) => void
// interface SystemSet<A extends App<any, any>, S extends AppStates<A>, SystemType extends UpdateSystem<A, S> | TransitionSystem<A, S>> {
// 	systems: SystemType[]
// 	condition?: ConditionSystem<A, S>
// }
// interface Schedulers<A extends App<any, any>, S extends AppStates<A>> {
// 	addSubscribers: (...systems: SubscriberSystem<A, S>[]) => void
// 	onEnter: (...systems: TransitionSystem<A, S>[]) => { runIf: (condition: ConditionSystem<A, S>) => void }
// 	onPreUpdate: (...systems: UpdateSystem<A, S>[]) => { runIf: (condition: ConditionSystem<A, S>) => void }
// 	onUpdate: (...systems: UpdateSystem<A, S>[]) => { runIf: (condition: ConditionSystem<A, S>) => void }
// 	onPostUpdate: (...systems: UpdateSystem<A, S>[]) => { runIf: (condition: ConditionSystem<A, S>) => void }
// 	onExit: (...systems: TransitionSystem<A, S>[]) => { runIf: (condition: ConditionSystem<A, S>) => void }
// }

export class AppBuilder<States extends string[] = [], Ressources extends Record<string, any> = Record<string, never>> {
	states: Set<States[number]>[] = []
	enabledStates: { [S in States[number]]?: Ressources[S] } = {}

	addState<S extends string>(...states: S[]) {
		this.states.push(new Set(states))

		return this as unknown as AppBuilder<[...States, S], Ressources>
	}

	bindRessource<S extends States[number], R>() {
		return this as unknown as AppBuilder<States, Ressources extends Record<string, never> ? { [key in S]: R } : Ressources & { [key in S]: R }>
	}

	setInitialState<S extends States[number]>(...args: S extends keyof Ressources ? Ressources extends Record<string, never> ? [state: S] : [state: S, ressouces: Ressources[S]] : [state: S]) {
		const [state, ressources] = args as [S, Ressources[S]]
		this.enabledStates[state] = ressources
		return this
	}

	build() {
		return new App<States, Ressources>(this)
	}
}
class App<States extends string[], Ressources extends Record<string, any> = Record<string, never>> {
	#systems: Systems<this> = {}

	#states: Set<States[number]>[] = []
	#enabledStates: { [S in States[number]]?: Ressources[S] } = {}
	#queue = new Set<() => void>()

	#callbackId: number | null = null
	constructor(appBuilder: AppBuilder<States, Ressources>) {
		this.#enabledStates = appBuilder.enabledStates
		this.#states = appBuilder.states
		for (const stateSet of appBuilder.states) {
			for (const state of stateSet) {
				this.#systems[state as AppStates<this>] = {
					subscribers: new Set(),
					enter: new Set(),
					preUpdate: new Set(),
					update: new Set(),
					postUpdate: new Set(),
					exit: new Set(),
					cleanUp: new Set(),
				}
			}
		}
	}

	async enable<S extends States[number]>(...args: S extends keyof Ressources ? [S, Ressources[S]] : [S]) {
		return new Promise<void>((resolve) => {
			this.#queue.add(async () => {
				const [state, ressources] = args
				this.#enabledStates[state] = ressources as Ressources[S]
				const systems = this.#systems[state]?.enter ?? []
				const otherStates = this.#states.find(s => s.has(state))
				if (otherStates) {
					for (const otherState of otherStates) {
						if (otherState !== state) {
							this.disable(otherState)
						}
					}
				}
				for (const system of systems) {
					await system(ressources as Ressources[S])
				}
				const subscriberSets = this.#systems[state]?.subscribers ?? []

				for (const sub of subscriberSets) {
					const unsub = sub(ressources as Ressources[S])
					this.#systems[state]?.cleanUp.add(unsub)
				}
				resolve()
			})
		})
	}

	disable = async <S extends States[number]>(state: S) => {
		const ressources = this.#enabledStates[state]
		delete this.#enabledStates[state]
		this.#systems[state]?.cleanUp.forEach((callBack) => {
			callBack()
		})
		this.#systems[state]?.cleanUp.clear()
		const systems = this.#systems[state]?.exit ?? []
		for (const system of systems) {
			await system(ressources as Ressources[S])
		}
	}

	isEnabled = <S extends States[number]>(state: S) => {
		return state in this.#enabledStates
	}

	isDisabled = <S extends States[number]>(state: S) => {
		return !(state in this.#enabledStates)
	}

	onPreUpdate<S extends AppStates<this>>(state: S, ...systems: UpdateSystem<this, S>[]) {
		for (const system of systems) {
			this.#systems[state]?.preUpdate.add(system)
		}
		return this
	}

	onUpdate<S extends AppStates<this>>(state: S, ...systems: UpdateSystem<this, S>[]) {
		for (const system of systems) {
			this.#systems[state]?.update.add(system)
		}
		return this
	}

	onPostUpdate<S extends AppStates<this>>(state: S, ...systems: UpdateSystem<this, S>[]) {
		for (const system of systems) {
			this.#systems[state]?.postUpdate.add(system)
		}
		return this
	}

	onEnter<S extends AppStates<this>>(state: S, ...systems: TransitionSystem<this, S>[]) {
		for (const system of systems) {
			this.#systems[state]?.enter.add(system)
		}
		return this
	}

	onExit<S extends AppStates<this>>(state: S, ...systems: TransitionSystem<this, S>[]) {
		for (const system of systems) {
			this.#systems[state]?.exit.add(system)
		}
		return this
	}

	addSubscribers<S extends AppStates<this>>(state: S, ...subscribers: SubscriberSystem<this, S>[]) {
		for (const subscriber of subscribers) {
			this.#systems[state]?.subscribers.add(subscriber)
		}
		return this
	}

	// #transitionSheduler = <S extends AppStates<this>>(schedule: 'enter' | 'exit', state: S): Schedulers<this, S>['onEnter' | 'onExit'] => {
	// 	return (...systems) => {
	// 		const set: SystemSet<this, S, TransitionSystem<this, S>> = { systems }
	// 		this.#systems[state]![schedule].add(set)
	// 		return {
	// 			runIf(fn) {
	// 				set.condition = fn
	// 			},
	// 		}
	// 	}
	// }

	// #updateScheduler = <S extends AppStates<this>>(schedule: 'preUpdate' | 'update' | 'postUpdate', state: S): Schedulers<this, S>['onPreUpdate' | 'onUpdate' | 'onPostUpdate'] => {
	// 	return (...systems) => {
	// 		const set: SystemSet<this, S, UpdateSystem<this, S>> = { systems }
	// 		this.#systems[state]![schedule].add(set)
	// 		return {
	// 			runIf(fn) {
	// 				set.condition = fn
	// 			},
	// 		}
	// 	}
	// }

	// #schedulers = <S extends AppStates<this>>(state: S): Schedulers<this, S> => {
	// 	return {
	// 		addSubscribers: (...subscribers: SubscriberSystem<this, S>[]) => {
	// 			for (const subscriber of subscribers) {
	// 				this.#systems[state]?.subscribers.add(subscriber)
	// 			}
	// 		},
	// 		onEnter: this.#transitionSheduler('enter', state),
	// 		onPreUpdate: this.#updateScheduler('preUpdate', state),
	// 		onUpdate: this.#updateScheduler('update', state),
	// 		onPostUpdate: this.#updateScheduler('postUpdate', state),
	// 		onExit: this.#transitionSheduler('exit', state),
	// 	}
	// }

	// addSystems<S extends AppStates<this>>(state: S, fn: (s: Schedulers<this, S>) => void) {
	// 	fn(this.#schedulers(state))

	// 	return this
	// }

	#runSchedule(schedule: Schedule) {
		const states = Object.keys(this.#enabledStates) as AppStates<this>[]
		for (const state of states) {
			const ressources = this.#enabledStates[state] as Ressources[typeof state]
			const systems = this.#systems[state]![schedule]
			for (const system of systems) {
				system(ressources)
			}
		}
	}

	#update() {
		this.#runSchedule('preUpdate')
		this.#runSchedule('update')
		this.#runSchedule('postUpdate')
		for (const callBack of this.#queue) {
			callBack()
		}
		this.#queue.clear()
	}

	addPlugins(...plugins: Plugin<this>[]) {
		for (const plugin of plugins) {
			plugin(this)
		}
		return this
	}

	animate = () => {
		this.#update()
		this.#callbackId = window.requestAnimationFrame(this.animate)
	}

	async start() {
		this.animate()
		for (const state of Object.keys(this.#enabledStates) as States[number][]) {
			const ressources = this.#enabledStates[state] as Ressources[typeof state]
			const args = [state, ressources] as States[number] extends keyof Ressources ? [state: States[number], ressources: Ressources[States[number]]] : [state: States[number]]
			await this.enable<typeof state>(...args)
		}
	}

	stop() {
		if (this.#callbackId !== null) {
			window.cancelAnimationFrame(this.#callbackId)
			this.#callbackId = null
		}
	}
}

export const runIf = (condition: () => boolean, ...systems: ((...args: any[]) => void)[]) => {
	return (...args: any[]) => {
		if (condition()) {
			for (const system of systems) {
				system(...args)
			}
		}
	}
}
