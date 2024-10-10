interface Commands<States extends string[], Ressources> {
	enable: <S extends States[number]>(...args: S extends keyof Ressources ? Ressources[S] extends object ? [state: S, ressources: Ressources[S]] : [state: S] : never) => Promise<void>
	disable: (state: States[number]) => void
	isEnabled: (state: States[number]) => boolean
	isDisabled: (state: States[number]) => boolean
}

type AppStates<A extends App<any, any>> = A extends App<infer States, any> ? States[number] : never

export type System<A extends App<any, any>, S extends AppStates<A> | undefined = undefined> = A extends App<infer States, infer Ressources>
	? (commands: Commands<States, Ressources>, ressources: S extends keyof Ressources ? Ressources[S] : undefined) => (void | System<A> | Promise<void>)
	: never
type Schedule = 'enter' | 'preUpdate' | 'update' | 'postUpdate' | 'exit'
export type Plugin<A extends App<any, any>> = (app: A) => void
export class AppBuilder<States extends string[] = [], Ressources extends Partial<Record<States[number], unknown>> = Partial<Record<string, never>>> {
	states: Set<States[number]>[] = []
	enabledStates: { [S in States[number]]?: Ressources[S] } = {}

	addState<S extends string>(...states: S[]) {
		this.states.push(new Set(states))

		return this as unknown as AppBuilder<[...States, S], Ressources>
	}

	bindRessource<S extends States[number], R>() {
		return this as AppBuilder<States, Ressources & { [key in S]: R }>
	}

	setInitialState<S extends States[number]>(...args: S extends keyof Ressources ? Ressources[S] extends object ? [state: S, ressources: Ressources[S]] : [state: S] : never) {
		const [state, ressources] = args
		this.enabledStates[state] = ressources
		return this
	}

	build() {
		return new App<States, Ressources>(this.states, this.enabledStates)
	}
}
class App<States extends string[], Ressources extends Partial<Record<States[number], any>>> {
	systems: { [S in States[number]]?: {
		[schedule in Schedule]: Set<System<this, any>>
	} & { cleanup: Set<() => void> } } = {}

	#queue = new Set<() => void>()

	#callbackId: number | null = null
	constructor(private states: Set<States[number]>[], private enabledStates: { [S in States[number]]?: Ressources[S] }) {
		for (const stateSet of states) {
			for (const state of stateSet) {
				this.systems[state] = {
					enter: new Set(),
					preUpdate: new Set(),
					update: new Set(),
					postUpdate: new Set(),
					exit: new Set(),
					cleanup: new Set(),
				}
			}
		}
	}

	runIf = (fn: (cmd: Commands<States, Ressources>) => boolean) => <S extends AppStates<this>>(...systems: System<this, S>[]) => {
		return (cmd: Commands<States, Ressources>, ressources: S extends keyof Ressources ? Ressources[S] : undefined) => {
			if (fn(cmd)) {
				for (const system of systems) {
					system(cmd, ressources)
				}
			}
		}
	}

	runIfEnabled = <S extends AppStates<this>>(state: S) => this.runIf(cmd => cmd.isEnabled(state))
	runIfDisabled = <S extends AppStates<this>>(state: S) => this.runIf(cmd => cmd.isDisabled(state))

	commands: Commands<States, Ressources> = {
		enable: async <S extends States[number]>(...args: S extends keyof Ressources ? Ressources[S] extends object ? [state: S, ressources: Ressources[S]] : [state: S] : never) => {
			const [state, ressources] = args
			this.enabledStates[state] = ressources as Ressources[S]
			const systems = this.systems[state]?.enter ?? []
			for (const system of systems) {
				const unsub = await system(this.commands, ressources as Ressources[S])
				if (unsub) {
					const cleanup = () => {
						unsub(this.commands, ressources as Ressources[S])
						this.systems[state]?.cleanup.delete(cleanup)
					}
					this.systems[state]?.cleanup.add(cleanup)
				}
			}
			const otherStates = this.states.find(s => s.has(state))
			if (otherStates) {
				for (const otherState of otherStates) {
					if (otherState !== state) {
						this.commands.disable(otherState)
					}
				}
			}
		},
		disable: <S extends States[number]>(state: S) => {
			const ressources = this.enabledStates[state]
			delete this.enabledStates[state]
			this.systems[state]?.cleanup.forEach((callBack) => {
				callBack()
			})
			this.systems[state]?.cleanup.clear()
			const systems = this.systems[state]?.exit ?? []
			for (const system of systems) {
				system(this.commands, ressources as Ressources[S])
			}
		},
		isEnabled: <S extends States[number]>(state: S) => {
			return state in this.enabledStates
		},
		isDisabled: <S extends States[number]>(state: S) => {
			return !(state in this.enabledStates)
		},
	}

	addSystems<S extends AppStates<this>>(schedule: Schedule, state: S, ...systems: System<this, S>[]) {
		for (const system of systems) {
			this.systems[state]?.[schedule].add(system)
		}
	}

	onEnter<S extends AppStates<this>>(state: S, ...systems: System<this, S>[]) {
		this.addSystems('enter', state, ...systems)
		return this
	}

	onUpdate<S extends AppStates<this>>(state: S, ...systems: System<this, S>[]) {
		this.addSystems('update', state, ...systems)
		return this
	}

	onPreUpdate<S extends AppStates<this>>(state: S, ...systems: System<this, S>[]) {
		this.addSystems('preUpdate', state, ...systems)
		return this
	}

	onPostUpdate<S extends AppStates<this>>(state: S, ...systems: System<this, S>[]) {
		this.addSystems('postUpdate', state, ...systems)
		return this
	}

	onEnxit<S extends AppStates<this>>(state: S, ...systems: System<this, S>[]) {
		this.addSystems('exit', state, ...systems)
		return this
	}

	#runSchedule(schedule: Schedule) {
		const states = Object.keys(this.enabledStates) as States[number][]
		for (const state of states) {
			const ressources = this.enabledStates[state]
			const systems = this.systems[state]?.[schedule]
			if (systems) {
				for (const system of systems) {
					system(this.commands, ressources as Ressources[typeof state])
				}
			}
		}
	}

	update() {
		this.#runSchedule('preUpdate')
		this.#runSchedule('update')
		this.#runSchedule('postUpdate')
		for (const callBack of this.#queue) {
			callBack()
		}
		this.#queue.clear()
	}

	addPlugins(...plugins: ((app: this) => void)[]) {
		for (const plugin of plugins) {
			plugin(this)
		}
		return this
	}

	animate = () => {
		this.update()
		this.#callbackId = window.requestAnimationFrame(this.animate)
	}

	async start() {
		for (const state of Object.keys(this.enabledStates) as AppStates<this>[]) {
			const ressources = this.enabledStates[state] as Ressources[typeof state]
			// @ts-expect-error to fix later
			await this.commands.enable<typeof state>(state, ressources)
		}
		this.animate()
	}

	stop() {
		if (this.#callbackId !== null) {
			window.cancelAnimationFrame(this.#callbackId)
			this.#callbackId = null
		}
	}
}
