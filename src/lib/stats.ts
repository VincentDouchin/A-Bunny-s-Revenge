import type { With } from 'miniplex'
import { Timer } from './timer'
import { set } from './state'
import type { ComponentsOfType, Entity } from '@/global/entity'
import { ecs, time } from '@/global/init'

export enum ModStage {
	Base,
	Add,
	Total,
}
export enum ModType {
	Add,
	Percent,
}

export interface Modifier<S extends ComponentsOfType<Stat> > {
	key: string
	from: string
	value: number
	stage: ModStage
	type: ModType
	name: S
	stackable: boolean
	duration: null | Timer<false>
}

export const createModifier = <S extends ComponentsOfType<Stat>>(from: string, name: S, value: number, stage: ModStage, type: ModType, stackable: boolean, duration: null | number = null): Modifier<S> => ({
	key: name + from,
	from,
	value,
	stage,
	type,
	name,
	stackable,
	duration: duration === null ? null : new Timer(duration, false),
})

export class Stat {
	#initialValue: number
	#lastValue: number
	#modifiers: Modifier<any>[] = []

	constructor(value: number) {
		this.#initialValue = value
		this.#lastValue = value
		this.calculate()
		return this
	}

	addModifier(modifier: Modifier<any>) {
		if (modifier.stackable || !this.#modifiers.some(m => m.key === modifier.key)) {
			this.#modifiers.push(modifier)
			this.calculate()
		}
		return this
	}

	hasModifier(from: string) {
		return this.#modifiers.some(mod => mod.from === from)
	}

	removeModifier(modifier: Modifier<any>) {
		this.#modifiers.splice(this.#modifiers.indexOf(modifier), 1)
		this.calculate()
	}

	tickModifiers(delta: number) {
		for (const modifier of this.#modifiers) {
			if (modifier.duration) {
				modifier.duration.tick(delta)
				if (modifier.duration.finished()) {
					this.removeModifier(modifier)
				}
			}
		}
	}

	calculate() {
		let value = this.#initialValue
		for (const stage of [ModStage.Base, ModStage.Add, ModStage.Total]) {
			const toAdd = this.#modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Add)
			for (const add of toAdd) {
				value += add.value
			}
			const toMultiply = this.#modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Percent)
			for (const mul of toMultiply) {
				value *= 1 + mul.value / 100
			}
		}
		this.#lastValue = value
	}

	get value() {
		return this.#lastValue
	}
}

export const addModifier = <S extends ComponentsOfType<Stat>>(mod: Modifier<S>, entity: With<Entity, S>, addHealth: boolean) => {
	if (mod.name === 'maxHealth' && entity.currentHealth && entity.maxHealth && addHealth) {
		const old = entity.maxHealth.value
		entity.maxHealth.addModifier(mod)
		const diff = entity.maxHealth.value - old
		entity.currentHealth += diff
	} else {
		entity[mod.name]?.addModifier(mod)
	}
}

export const tickModifiers = (...components: ComponentsOfType<Stat>[]) => {
	return set(components.map((component) => {
		const query = ecs.with(component)
		return () => {
			for (const entity of query) {
				entity[component].tickModifiers(time.delta)
			}
		}
	}))
}