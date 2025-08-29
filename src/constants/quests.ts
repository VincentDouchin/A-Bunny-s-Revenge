import type { icons } from '@assets/assets'
import type { Item } from './items'
import type { SaveData } from '@/global/save'
import type { App, AppStates, SubscriberSystem, TransitionSystem, UpdateSystem } from '@/lib/app'
import { Event } from 'eventery'

export type QuestStep = Readonly<{
	readonly description: string
	readonly items?: ReadonlyArray<Item>
	readonly icon?: icons
	readonly key: string
}>

export class QuestManager<A extends App<any, any>> {
	constructor(private app: A, private save: SaveData) { }

	#quests = new Set<Quest2<A, any, any>>()
	completeStepEvent = new Event<[QuestStep]>()
	unlockedQuestEvent = new Event<[Quest2<any, any, any>]>()
	createQuest<S extends QuestStep[] = [], D extends Record<string, any> = Record<string, never>>(questData: Readonly<{
		state: AppStates<A>
		steps: S
		data: D
		name: string
	}>) {
		const quest = new Quest2(questData, this.app, this.save, this)
		this.#quests.add(quest)
		return quest
	}

	enableQuests = () => {
		for (const quest of this.#quests) {
			quest.register()
			if (this.save.quests[quest.name].unlocked) {
				quest.unlock()
			}
		}
	}
}

export class Quest2<A extends App<any, Record<string, never>>, S extends ReadonlyArray<QuestStep> = [], D extends Record<string, any> = Record<string, never>> {
	#subscribers = {} as Record<S[number]['key'], Set<() => (() => void) | void>>
	name: string
	data: D
	#app: A
	#steps: Readonly<S>
	#manager: QuestManager<A>
	state: AppStates<A>
	unlocked = false
	constructor(
		quest: Readonly<{
			state: AppStates<A>
			steps: S
			data: D
			name: string
		}>,
		app: A,
		private save: SaveData,
		questManager: QuestManager<A>,
	) {
		this.#app = app
		this.#manager = questManager
		this.#steps = quest.steps
		this.state = quest.state
		this.name = quest.name
		this.data = quest.data
		for (const step of quest.steps) {
			this.#subscribers[step.key as S[number]['key']] = new Set()
		}
		return this as Quest2<A, S, D>
	}

	register() {
		if (!(this.name in this.save.quests)) {
			this.save.quests[this.name] = {
				unlocked: false,
				data: this.data,
				steps: this.#steps.reduce((acc, v) => ({ ...acc, [v.key]: false }), {}),
			}
		}
		this.data = this.save.quests[this.name].data
	}

	unlock() {
		if (this.#steps.some(s => !this.hasCompletedStep(s.key))) {
			this.save.quests[this.name].unlocked = true
			this.unlocked = true
			// @ts-expect-error fix this later
			this.#app.enable(this.state)
			this.#manager.unlockedQuestEvent.emit(this)
		}
	}

	getStep(step: S[number]['key']): QuestStep {
		return this.#steps.find(s => s.key === step)!
	}

	complete(step: S[number]['key']) {
		this.save.quests[this.name].steps[step] = true
		for (const subscribers of this.#subscribers[step]) {
			subscribers()
		}
		this.#manager.completeStepEvent.emit(this.getStep(step))
		if (this.#steps.findIndex(s => s.key === step) === this.#steps.length - 1) {
			this.#app.disable(this.state)
		}
	}

	#previousStep(step: S[number]['key']): S[number]['key'] | undefined {
		const index = this.#steps.findIndex(s => s.key === step)
		const previousStep = this.#steps[index - 1]
		return previousStep?.key
	}

	onEnter(fn: TransitionSystem<A>) {
		this.#app.onEnter(this.state, fn)
	}

	onUpdate(fn: UpdateSystem<A>) {
		this.#app.onUpdate(this.state, fn)
	}

	onExit(fn: TransitionSystem<A>) {
		this.#app.onExit(this.state, fn)
	}

	addSubscribers(fn: SubscriberSystem<A>) {
		this.#app.addSubscribers(this.state, fn)
	}

	hasCompletedStep(step: S[number]['key']) {
		return this.save.quests[this.name].steps[step]
	}

	untilIsComplete(step: S[number]['key'], fn: () => (() => void) | void) {
		const system = () => {
			const unsub = fn()
			if (unsub) {
				this.#subscribers[step].add(unsub)
			}
		}
		this.#app.onEnter(this.state, system as TransitionSystem<A>)
	}

	marker(step: S[number]['key']) {
		return { quest: this, step }
	}

	isStepUnlocked(step: S[number]['key']) {
		const prev = this.#previousStep(step)
		if (prev) {
			return this.hasCompletedStep(prev)
		} else {
			return this.unlocked
		}
	}

	showMarker(step: S[number]['key']) {
		if (!this.hasCompletedStep(step) && this.isStepUnlocked(step)) {
			return true
		}
		return false
	}

	betweenSteps(from: S[number]['key'], to: S[number]['key'], fn: () => (() => void) | void) {
		const prev = this.#previousStep(from)
		if (prev) {
			this.#subscribers[prev].add(() => {
				const unsub = fn()
				if (unsub) {
					this.#subscribers[to].add(unsub)
				}
			})
		}
	}

	onComplete(step: S[number]['key'], callback: () => void) {
		this.#subscribers[step].add(callback)
	}
}
