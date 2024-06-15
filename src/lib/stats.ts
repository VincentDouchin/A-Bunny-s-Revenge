export enum ModStage {
	Base,
	Add,
	Total,
}
export enum ModType {
	Add,
	Percent,
}

export class Stat {
	#initialValue: number
	modifiers: { stage: ModStage, type: ModType, value: number }[] = []

	constructor(value: number) {
		this.#initialValue = value
		return this
	}

	get value() {
		let value = this.#initialValue
		for (const stage of [ModStage.Base, ModStage.Add, ModStage.Total]) {
			const toAdd = this.modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Add)
			for (const add of toAdd) {
				value += add.value
			}
			const toMultiply = this.modifiers.filter(mod => mod.stage === stage && mod.type === ModType.Percent)
			for (const mul of toMultiply) {
				value *= 1 + mul.value / 100
			}
		}
		return value
	}
}
