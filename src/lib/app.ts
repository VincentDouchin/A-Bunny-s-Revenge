import { objectKeys } from '@/utils/mapFunctions'

export type AppStates<A extends App<any, any>> = A extends App<infer States, any> ? States[number] : never

export type UpdateSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Resources>
	? (resources: S extends keyof Resources ? Resources[S] : void) => void
	: never

export type TransitionSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Resources>
	? (resources: S extends keyof Resources ? Resources[S] : void) => Promise<void> | void
	: never

export type SubscriberSystem<A extends App<any, any>, S extends AppStates<A> | void = void> = A extends App<any, infer Resources>
	? (resources: S extends keyof Resources ? Resources[S] : void) => () => void
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
		render: Set<() => void>
	}
}
export type Resources<A extends App<any, any>, S extends AppStates<A>> = A extends App<any, infer R>
	? R[S]
	: never

type Schedule = 'enter' | 'preUpdate' | 'update' | 'postUpdate' | 'exit'
export type Plugin<A extends App<any, any>> = (app: A) => void

export class AppBuilder<States extends string[] = [], Resources extends Record<string, any> = Record<string, never>> {
	states: Set<States[number]>[] = []
	enabledStates: { [S in States[number]]?: Resources[S] } = {}

	addState<S extends string>(...states: S[]) {
		this.states.push(new Set(states))

		return this as unknown as AppBuilder<[...States, S], Resources>
	}

	bindResource<S extends States[number], R>() {
		return this as unknown as AppBuilder<States, Resources extends Record<string, never> ? { [key in S]: R } : Resources & { [key in S]: R }>
	}

	build() {
		return new App<States, Resources>(this)
	}
}

export class App<States extends string[], Resources extends Record<string, any> = Record<string, never>> {
	#systems: Systems<this> = {}

	#states: Set<States[number]>[] = []
	#enabledStates: { [S in States[number]]?: Resources[S] } = {}
	#queue = new Set<() => void>()

	readonly #fixedTimeStep: number = 1000 / 60 // 60 FPS in milliseconds
	#previousTime: number = 0
	#accumulator: number = 0
	#running: boolean = false
	#callbackId: number | null = null
	#initCallBack: (() => (void | Promise<void>)) | null = null
	constructor(appBuilder: AppBuilder<States, Resources>) {
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
					render: new Set(),
				}
			}
		}
	}

	onInit(fn: () => (void | Promise<void>)) {
		this.#initCallBack = fn
		return this
	}

	get states() {
		return this.#states.flatMap(states => [...states]) as AppStates<this>[]
	}

	getResources<S extends States[number]>(state: S) {
		return this.#enabledStates[state]
	}

	async enable<S extends States[number]>(...args: S extends keyof Resources ? [state: S, resources: Resources[S]] : [state: S]) {
		return new Promise<void>((resolve) => {
			this.#queue.add(async () => {
				const [state, resources] = args
				this.#enabledStates[state] = resources as Resources[S]
				const systems = this.#systems[state]?.enter ?? []
				const otherStates = this.#states.find(s => s.has(state))
				if (otherStates) {
					for (const otherState of otherStates) {
						if (otherState !== state) {
							await this.disable(otherState)
						}
					}
				}
				for (const system of systems) {
					await system(resources as Resources[S])
				}
				const subscriberSets = this.#systems[state]?.subscribers ?? []
				for (const sub of subscriberSets) {
					const unSub = sub(resources as Resources[S])
					this.#systems[state]?.cleanUp.add(unSub)
				}

				resolve()
			})
		})
	}

	disable = async <S extends States[number]>(state: S) => {
		if (this.isDisabled(state)) return
		const resources = this.#enabledStates[state]
		delete this.#enabledStates[state]
		this.#systems[state]?.cleanUp.forEach((callBack) => {
			callBack()
		})
		this.#systems[state]?.cleanUp.clear()
		const systems = this.#systems[state]?.exit ?? []
		for (const system of systems) {
			await system(resources as Resources[S])
		}
	}

	isEnabled = <S extends States[number]>(state: S) => {
		return state in this.#enabledStates
	}

	isDisabled = <S extends States[number]>(state: S) => {
		return !(state in this.#enabledStates)
	}

	onRender<S extends AppStates<this>>(state: S, ...systems: (() => void)[]) {
		for (const system of systems) {
			this.#systems[state]?.render.add(system)
		}
		return this
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

	#runSchedule(schedule: Schedule) {
		const states = Object.keys(this.#enabledStates) as AppStates<this>[]
		for (const state of states) {
			const resources = this.#enabledStates[state] as Resources[typeof state]
			const systems = this.#systems[state]![schedule]
			for (const system of systems) {
				system(resources)
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

	loop() {
		if (!this.#running) return

		const currentTime = performance.now()
		let deltaTime = currentTime - this.#previousTime

		if (deltaTime > 250) {
			deltaTime = 250
		}

		this.#accumulator += deltaTime
		this.#previousTime = currentTime

		while (this.#accumulator >= this.#fixedTimeStep) {
			this.#update()
			this.#accumulator -= this.#fixedTimeStep
		}

		this.#render()

		this.#callbackId = requestAnimationFrame(() => this.loop())
	}

	#render() {
		for (const state of Object.keys(this.#enabledStates) as AppStates<this>[]) {
			const systems = this.#systems[state]!.render
			for (const system of systems) {
				system()
			}
		}
	}

	async start() {
		this.#running = true
		this.loop()
		this.#initCallBack && await this.#initCallBack()
		this.#initCallBack = null
	}

	pause() {
		this.#queue.add(() => {
			if (this.#callbackId !== null) {
				window.cancelAnimationFrame(this.#callbackId)
				this.#callbackId = null
				this.#running = false
			}
		})
	}

	async stop() {
		for (const state of objectKeys(this.#enabledStates)) {
			await this.disable(state)
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

export const set = <A extends App<any, any>, S extends AppStates<A>>(systems: UpdateSystem<A, S>[]) => (args: Resources<A, S>) => {
	for (const system of systems) {
		system(args)
	}
}