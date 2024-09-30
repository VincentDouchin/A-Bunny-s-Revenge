import type { DungeonRessources, FarmRessources } from '@/global/states'

// type EnableCommand<S extends string, Ressources extends Record<string, any>> =

interface Commands<Ressources extends Partial<Record<States[number], any>>, States extends string[]> {
	enable: <S extends States[number]>(...args: S extends keyof Ressources ? [S, Ressources[S]] : [S]) => void
	disable: (state: States[number]) => void
	isEnabled: (state: States[number]) => boolean
	isDisabled: (state: States[number]) => boolean
}

type System<A extends App<any, any>> = A extends App< infer Ressources, infer States>
	? (commands: Commands<Ressources, States>) => (void | System<A> | Promise<void>)
	: never

type Schedule = 'enter' | 'preUpdate' | 'update' | 'postUpdate' | 'exit'

interface Schedulers<A extends App<any, any>> {
	onEnter: (...systems: System<A>[]) => void
	onPreUpdate: (...systems: System<A>[]) => void
	onUpdate: (...systems: System<A>[]) => void
	onPostUpdate: (...systems: System<A>[]) => void
	onExit: (...systems: System<A>[]) => void
}

class App<Ressources extends Partial<Record<States[number], any>>, States extends string[] = []> {
	states: Set<States[number]>[] = []
	enabledStates: { [S in States[number]]?: Ressources[S] } = {}
	systems: { [S in States[number]]?: {
		[schedule in Schedule]: Set<System<this>>
	} & { cleanup: Set<() => void> } } = {}

	#queue = new Set<() => void>()

	#callbackId: number | null = null

	commands: Commands<Ressources, States> = {
		enable: async (...args) => {
			const [state, ressources] = args
			this.enabledStates[state] = ressources
			const systems = this.systems[state]?.enter ?? []
			for (const system of systems) {
				const unsub = await system(this.commands)
				if (unsub) {
					const cleanup = () => {
						unsub(this.commands)
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
		disable: (state) => {
			delete this.enabledStates[state]
			this.systems[state]?.cleanup.forEach((callBack) => {
				callBack()
			})
			this.systems[state]?.cleanup.clear()
			const systems = this.systems[state]?.exit ?? []
			for (const system of systems) {
				system(this.commands)
			}
		},
		isEnabled: (state) => {
			return state in this.enabledStates
		},
		isDisabled: (state) => {
			return !(state in this.enabledStates)
		},
	}

	schedulers = (state: States[number]): Schedulers<this> => {
		const scheduler = (schedule: Schedule) => (...systems: System<this>[]) => {
			for (const system of systems) {
				this.systems[state]?.[schedule].add(system)
			}
		}
		return {
			onEnter: scheduler('enter'),
			onPreUpdate: scheduler('preUpdate'),
			onUpdate: scheduler('update'),
			onPostUpdate: scheduler('postUpdate'),
			onExit: scheduler('exit'),
		}
	}

	addState<S extends string>(...states: S[]) {
		this.states.push(new Set(states))
		for (const state of states) {
			this.systems[state] = {
				enter: new Set(),
				preUpdate: new Set(),
				update: new Set(),
				postUpdate: new Set(),
				exit: new Set(),
				cleanup: new Set(),
			}
		}
		return this as unknown as App<Ressources, [...States, S]>
	}

	bindRessource<S extends States[number], R >() {
		return this as App<Ressources & { [key in S]: R }, States >
	}

	addSystems<S extends States[number]>(state: S, fn: (s: Schedulers<this>) => void) {
		fn(this.schedulers(state))
		return this
	}

	#runSchedule(schedule: Schedule) {
		const states = Object.keys(this.enabledStates) as States[number][]
		for (const state of states) {
			const systems = this.systems[state]?.[schedule]
			if (systems) {
				for (const system of systems) {
					system(this.commands)
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

	addPlugin<A extends App<any, any>>(plugin: (app: App<Ressources, States>) => A) {
		return plugin(this) as A
	}

	animate = () => {
		this.update()
		this.#callbackId = window.requestAnimationFrame(this.animate)
	}

	start() {
		this.animate()
	}

	stop() {
		if (this.#callbackId !== null) {
			window.cancelAnimationFrame(this.#callbackId)
			this.#callbackId = null
		}
	}
}
const spawnPlayer: System<typeof app> = ({ enable }) => {
	enable('intro')
}

export const app = new App()
	.addState('farm', 'dungeon', 'intro')
	.bindRessource<'farm', FarmRessources>()
	.bindRessource<'dungeon', DungeonRessources>()
	.addSystems('farm', ({ onEnter }) => {
		onEnter(spawnPlayer)
	})
