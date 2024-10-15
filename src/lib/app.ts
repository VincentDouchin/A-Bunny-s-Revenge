// import { runIf } from './state'

// interface Commands<States extends string[], Ressources> {
// 	enable: <S extends States[number]>(...args: S extends keyof Ressources ? [S, Ressources[S]] : [S]) => Promise<void>
// 	disable: (state: States[number]) => void
// 	isEnabled: (state: States[number]) => boolean
// 	isDisabled: (state: States[number]) => boolean
// }

// type AppStates<A extends App<any, any>> = A extends App<infer States, any> ? States[number] : never

// export type UpdateSystem<A extends App<any, any>, S extends AppStates<A> | undefined = undefined> = A extends App<infer States, infer Ressources>
// 	? (commands: Commands<States, Ressources>, ressources: S extends keyof Ressources ? Ressources[S] : undefined) => void
// 	: never

// export type TransitionSystem<A extends App<any, any>, S extends AppStates<A> | undefined = undefined> = A extends App<infer States, infer Ressources>
// 	? (commands: Commands<States, Ressources>, ressources: S extends keyof Ressources ? Ressources[S] : undefined) => Promise<void> | void | UpdateSystem<A, S>
// 	: never

// type Systems<A extends App<any, any>> = {
// 	[S in AppStates<A>]?: {
// 		preUpdate: Set<UpdateSystem<A, S>>
// 		update: Set<UpdateSystem<A, S>>
// 		postUpdate: Set<UpdateSystem<A, S>>
// 		enter: Set<TransitionSystem<A, S>>
// 		exit: Set<TransitionSystem<A, S>>
// 		cleanUp: Set<() => void>
// 	}
// }

// type Schedule = 'enter' | 'preUpdate' | 'update' | 'postUpdate' | 'exit'
// export type Plugin<A extends App<any, any>> = (app: A) => void
// interface Schedulers<A extends App<any, any>, S extends AppStates<A>> {
// 	onEnter: (...systems: TransitionSystem<A, S>[]) => { runIf: (...args: A extends App<infer States, infer Ressources> ? S extends keyof Ressources ? [cmd: Commands<States, Ressources>, ressources: Ressources[S]] : [cmd: Commands<States, Ressources>] : never) => boolean }
// 	onPreUpdate: (...systems: UpdateSystem<A, S>[]) => void
// 	onUpdate: (...systems: UpdateSystem<A, S>[]) => void
// 	onPostUpdate: (...systems: UpdateSystem<A, S>[]) => void
// 	onExit: (...systems: TransitionSystem<A, S>[]) => void
// }

// export class AppBuilder<States extends string[], Ressources extends Record<string, any> = Record<string, never>> {
// 	states: Set<States[number]>[] = []
// 	enabledStates: { [S in States[number]]?: Ressources[S] } = {}

// 	addState<S extends string>(...states: S[]) {
// 		this.states.push(new Set(states))

// 		return this as unknown as AppBuilder<[...States, S], Ressources>
// 	}

// 	bindRessource<S extends States[number], R>() {
// 		return this as unknown as AppBuilder<States, Ressources extends Record<string, never> ? { [key in S]: R } : Ressources & { [key in S]: R }>
// 	}

// 	setInitialState<S extends States[number]>(...args: S extends keyof Ressources ? Ressources[S] extends object ? [state: S, ressources: Ressources[S]] : [state: S] : never) {
// 		const [state, ressources] = args
// 		this.enabledStates[state] = ressources
// 		return this
// 	}

// 	build() {
// 		return new App<States, Ressources>(this)
// 	}
// }
// class App<States extends string[], Ressources extends Record<string, any> = Record<string, never>> {
// 	#systems: Systems<this> = {}

// 	#states: Set<States[number]>[] = []
// 	#enabledStates: { [S in States[number]]?: Ressources[S] } = {}
// 	#queue = new Set<() => void>()

// 	#callbackId: number | null = null
// 	constructor(appBuilder: AppBuilder<States, Ressources>) {
// 		this.#enabledStates = appBuilder.enabledStates
// 		this.#states = appBuilder.states
// 		for (const stateSet of appBuilder.states) {
// 			for (const state of stateSet) {
// 				this.#systems[state as AppStates<this>] = {
// 					enter: new Set(),
// 					preUpdate: new Set(),
// 					update: new Set(),
// 					postUpdate: new Set(),
// 					exit: new Set(),
// 					cleanUp: new Set(),
// 				}
// 			}
// 		}
// 	}

// 	#commands: Commands<States, Ressources> = {
// 		enable: async <S extends States[number]>(...args: S extends keyof Ressources ? [S, Ressources[S]] : [S]) => new Promise((resolve) => {
// 			this.#queue.add(async () => {
// 				const [state, ressources] = args
// 				this.#enabledStates[state] = ressources as Ressources[S]
// 				const systems = this.#systems[state]?.enter ?? []
// 				const otherStates = this.#states.find(s => s.has(state))
// 				if (otherStates) {
// 					for (const otherState of otherStates) {
// 						if (otherState !== state) {
// 							this.#commands.disable(otherState)
// 						}
// 					}
// 				}
// 				for (const system of systems) {
// 					const unsub = await system(this.#commands, ressources as Ressources[S])
// 					if (unsub) {
// 						const cleanup = () => {
// 							unsub(this.#commands, ressources as Ressources[S])
// 							this.#systems[state]?.cleanUp.delete(cleanup)
// 						}
// 						this.#systems[state]?.cleanUp.add(cleanup)
// 					}
// 				}
// 				resolve()
// 			})
// 		}),
// 		disable: <S extends States[number]>(state: S) => {
// 			const ressources = this.#enabledStates[state]
// 			delete this.#enabledStates[state]
// 			this.#systems[state]?.cleanUp.forEach((callBack) => {
// 				callBack()
// 			})
// 			this.#systems[state]?.cleanUp.clear()
// 			const systems = this.#systems[state]?.exit ?? []
// 			for (const system of systems) {
// 				system(this.#commands, ressources as Ressources[S])
// 			}
// 		},
// 		isEnabled: <S extends States[number]>(state: S) => {
// 			return state in this.#enabledStates
// 		},
// 		isDisabled: <S extends States[number]>(state: S) => {
// 			return !(state in this.#enabledStates)
// 		},
// 	}

// 	#systemsToAdd: {
// 		[Sc in Schedule]?: Set<{
// 			systems: Sc extends 'enter' | 'exit' ? TransitionSystem<App<States, Ressources>, any>[] : UpdateSystem<App<States, Ressources>, any>[]
// 			condition?: <S extends States[number]>(cmd: Commands<States, Ressources>, ressources: S extends keyof Ressources ? Ressources[S] : never) => boolean
// 		}>
// 	} = {}

// 	#processSystems(state: AppStates<this>) {
// 		for (const schedule of Object.keys(this.#systemsToAdd) as Schedule[]) {
// 			const sets = this.#systemsToAdd[schedule]
// 			if (!sets) continue
// 			for (const { condition, systems } of sets) {
// 				if (condition) {
// 					for (const system of systems) {
// 						this.#systems[state]?.[schedule].add((...args) => {
// 							if (condition(...args)) {
// 								system(...args)
// 							}
// 						})
// 					}
// 				}
// 			}
// 		}
// 	}

// 	#scheduler = <Sc extends Schedule>(schedule: Sc) => (...systems: Sc extends 'enter' | 'exit' ? TransitionSystem<App<States, Ressources>, any>[] : UpdateSystem<App<States, Ressources>, any>[]) => {
// 		const set: {
// 			systems: Sc extends 'enter' | 'exit' ? TransitionSystem<App<States, Ressources>, any>[] : UpdateSystem<App<States, Ressources>, any>[]
// 			condition?: (cmd: Commands<States, Ressources>) => boolean
// 		} = { systems }
// 		this.#systemsToAdd[schedule] ??= new Set()
// 		this.#systemsToAdd[schedule].add(set)
// 		return {
// 			runIf: (fn: (cmd: Commands<States, Ressources>) => boolean) => {
// 				set.condition = fn
// 			},
// 		}
// 	}

// 	#schedulers: Schedulers<this, any> = {
// 		onEnter: this.#scheduler('enter'),
// 		onPreUpdate: this.#scheduler('preUpdate'),
// 		onUpdate: this.#scheduler('update'),
// 		onPostUpdate: this.#scheduler('postUpdate'),
// 		onExit: this.#scheduler('exit'),
// 	}

// 	addSystems<S extends AppStates<this>>(state: S, fn: (s: Schedulers<this, S>) => void) {
// 		fn(this.#schedulers)
// 		this.#processSystems(state)
// 		return this
// 	}

// 	#runSchedule(schedule: Schedule) {
// 		const states = Object.keys(this.#enabledStates) as States[number][]
// 		for (const state of states) {
// 			const ressources = this.#enabledStates[state]
// 			const systems = this.#systems[state]?.[schedule]
// 			if (systems) {
// 				for (const system of systems) {
// 					system(this.#commands, ressources as Ressources[typeof state])
// 				}
// 			}
// 		}
// 	}

// 	#update() {
// 		this.#runSchedule('preUpdate')
// 		this.#runSchedule('update')
// 		this.#runSchedule('postUpdate')
// 		for (const callBack of this.#queue) {
// 			callBack()
// 		}
// 		this.#queue.clear()
// 	}

// 	addPlugins(...plugins: ((app: this) => void)[]) {
// 		for (const plugin of plugins) {
// 			plugin(this)
// 		}
// 		return this
// 	}

// 	animate = () => {
// 		this.#update()
// 		this.#callbackId = window.requestAnimationFrame(this.animate)
// 	}

// 	async start() {
// 		for (const state of Object.keys(this.#enabledStates) as States[number][]) {
// 			const ressources = this.#enabledStates[state] as Ressources[typeof state]
// 			const args = [state, ressources] as States[number] extends keyof Ressources ? [state: States[number], ressources: Ressources[States[number]]] : [state: States[number]]
// 			await this.#commands.enable<typeof state>(...args)
// 		}
// 		this.animate()
// 	}

// 	stop() {
// 		if (this.#callbackId !== null) {
// 			window.cancelAnimationFrame(this.#callbackId)
// 			this.#callbackId = null
// 		}
// 	}
// }

// const app = new AppBuilder()
// 	.addState('hello', 'there')
// 	.bindRessource<'hello', { hi: string }>()
// 	.bindRessource<'there', { general: string }>()
// 	.setInitialState('hello', { hi: 'grievous' })
// 	.build()

// const sayHello: UpdateSystem<typeof app, 'hello'> = (cmd, _res) => {
// 	cmd.enable('hello', { hi: 'test' })
// }

// app.addSystems('hello', ({ onEnter }) => {
// 	onEnter(sayHello)
// }).start()