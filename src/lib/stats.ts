export enum ModStage {
	Base,
	Add,
	Total,
}
export enum ModType {
	Add,
	Percent,
}

export type StatNames = 'strength'
export interface Modifier {
	value: number
	stage: ModStage
	type: ModType
	name: StatNames
}

export const createModifier = (name: StatNames, value: number, stage: ModStage, type: ModType): Modifier => ({
	value,
	stage,
	type,
	name,
})

export class Stat {
	#initialValues = new Map<StatNames, number>()
	#lastValues = new Map<StatNames, number>()

	#modifiers: Modifier[] = []

	set(name: StatNames, value: number) {
		this.#initialValues.set(name, value)
		return this
	}

	addModifier(modifier: Modifier) {
		if (!this.#modifiers.includes(modifier)) {
			this.#modifiers.push(modifier)
		}
		this.calculate(modifier.name)
		return this
	}

	calculate(name: StatNames) {
		let value = this.#initialValues.get(name) ?? 0
		for (const stage of [ModStage.Base, ModStage.Add, ModStage.Total]) {
			const toAdd = this.#modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Add)
			for (const add of toAdd) {
				value += add.value
			}
			const toMultiply = this.#modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Percent)
			for (const mul of toMultiply) {
				value *= mul.value / 100
			}
		}
		this.#lastValues.set(name, value)
	}

	get(name: StatNames) {
		return this.#lastValues.get(name) ?? 0
	}
}