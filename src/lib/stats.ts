import type { With } from 'miniplex'
import type { ComponentsOfType, Entity } from '@/global/entity'

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
	value: number
	stage: ModStage
	type: ModType
	name: S
	stackable: boolean
}

export const createModifier = <S extends ComponentsOfType<Stat>>(name: S, value: number, stage: ModStage, type: ModType, stackable: boolean): Modifier<S> => ({
	value,
	stage,
	type,
	name,
	stackable,
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
		if (modifier.stackable || !this.#modifiers.includes(modifier)) {
			this.#modifiers.push(modifier)
		}
		this.calculate()
		return this
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

export const addModifier = <S extends ComponentsOfType<Stat>>(mod: Modifier<S>, entity: With<Entity, S>) => {
	if (mod.name === 'maxHealth' && entity.currentHealth && entity.maxHealth) {
		const old = entity.maxHealth.value
		entity.maxHealth.addModifier(mod)
		const diff = entity.maxHealth.value - old
		entity.currentHealth += diff
	} else {
		entity[mod.name]?.addModifier(mod)
	}
}