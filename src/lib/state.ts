import type { Entity } from '@/global/entity'
import type { Query } from 'miniplex'

export type System<R> = (ressources: R) => void | Promise<void>
export type Subscriber<R> = (ressources: R) => () => void

export class StateMananger {
	elapsedTime = 0
	states = new Map<State<any>, any>()
	callbacks = new Map<State<any>, System<any>[]>()
	queue = new Set<() => void>()
	running = true
	toDisable: null | State = null
	onNextTick(callback: () => void) {
		this.queue.add(callback)
	}

	create<R = void>() {
		return new State<R>(this)
	}

	async enable<S extends State<R>, R>(state: S, ressources: R) {
		this.states.set(state, ressources)
		for (const system of state._enter) {
			await system(ressources)
		}
		if (state._subscribers.length) {
			this.callbacks.set(state, state._subscribers.map(s => s(ressources)))
		}
	}

	disable(state: State<any>) {
		const ressources = this.states.get(state)
		const callbacks = this.callbacks.get(state)
		if (callbacks) {
			for (const callback of callbacks) {
				callback(ressources)
			}
		}
		for (const system of state._exit) {
			system(ressources)
		}
		this.states.delete(state)
	}

	update() {
		if (this.running) {
			for (const [state, ressources] of this.states.entries()) {
				for (const system of state._preUpdate) {
					system(ressources)
				}
			}
			for (const [state, ressources] of this.states.entries()) {
				for (const system of state._update) {
					system(ressources)
				}
			}
			for (const [state, ressources] of this.states.entries()) {
				for (const system of state._postUpdate) {
					system(ressources)
				}
			}
			for (const callback of this.queue) {
				callback()
			}
			this.queue.clear()
			this.elapsedTime = 0
		}
	}

	exclusive(...states: State<any>[]) {
		for (const state of states) {
			state.onEnter(...states.filter(s => s !== state).map(s => () => {
				if (this.states.has(s)) {
					s.disable()
				}
			}))
		}
	}

	stop() {
		this.running = false
	}

	start() {
		this.running = true
	}
}
export class State<R = void> {
	_enter = new Array<System<R>>()
	_exit = new Array<System<R>>()
	_preUpdate = new Array<System<R>>()
	_postUpdate = new Array<System<R>>()
	_update = new Array<System<R>>()
	_subscribers = new Array<Subscriber<R>>()
	_callBacks = new Array<System<R>>()
	_render = new Array<System<R>>()
	#app: StateMananger
	constructor(app: StateMananger) {
		this.#app = app
	}

	get enabled() {
		return this.#app.states.has(this)
	}

	get disabled() {
		return !this.enabled
	}

	addSubscriber(...subscribers: Subscriber<R>[]) {
		this._subscribers.push(...subscribers)
		return this
	}

	onEnter(...systems: System<R>[]) {
		this._enter.push(...systems)
		return this
	}

	onExit(...systems: System<R>[]) {
		this._exit.push(...systems)
		return this
	}

	onPreUpdate(...systems: System<R>[]) {
		this._preUpdate.push(...systems)
		return this
	}

	onPostUpdate(...systems: System<R>[]) {
		this._postUpdate.push(...systems)
		return this
	}

	onUpdate(...systems: System<R>[]) {
		this._update.push(...systems)
		return this
	}

	onRender(...systems: System<R>[]) {
		this._render.push(...systems)
		return this
	}

	addPlugins(...plugins: Array<(state: State<R>) => void>) {
		for (const plugin of plugins) {
			plugin(this)
		}
		return this
	}

	enable(ressources: R) {
		return new Promise<void>((resolve) => {
			this.#app.queue.add(() => {
				if (this.enabled) {
					this.disable()
				}
				this.#app.enable(this, ressources)
				resolve()
			})
		})
	}

	async toggle(ressources: R) {
		if (this.enabled) {
			await this.disable()
		} else {
			await this.enable(ressources)
		}
	}

	disable() {
		this.#app.disable(this)
	}
}
export const runIf = <R>(condition: () => boolean, ...systems: System<R>[]) => (ressources: R) => {
	if (condition()) {
		for (const system of systems) {
			system(ressources)
		}
	}
}

export const set = <R>(systems: System<R>[]): System<R> => (ressources: R) => {
	for (const system of systems) {
		system(ressources)
	}
}

export const enterAndSubscribe = <E extends Entity>(query: Query<E>, fn: (e: E) => void) => (s: State) => {
	s.onEnter(() => {
		for (const entity of query) {
			fn(entity)
		}
	})
	s.addSubscriber(() => query.onEntityAdded.subscribe(fn))
}