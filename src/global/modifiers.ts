import type { AllComponentsOfType, ComponentsOfType } from './entity'
import { ecs, time } from './init'
import type { Meals } from '@/constants/items'
import type { State } from '@/lib/state'
import type { Stat } from '@/lib/stats'
import { ModStage, ModType } from '@/lib/stats'
import { Timer } from '@/lib/timer'

export interface Modifier {
	stat: ComponentsOfType<Stat>
	type: ModType
	stage: ModStage
	value: number
}

interface ModifierDef {
	duration: number | null
	stackable: boolean
	mods: Modifier[]
}

export type Modifiers = 'sleepingPowder' | 'honeySpot' | 'godMode' | Meals
export const modifiers: Record<Modifiers, ModifierDef> = {
	godMode: {
		duration: null,
		stackable: false,
		mods: [
			{ stat: 'strength', type: ModType.Add, stage: ModStage.Add, value: 1000 },
		],
	},
	sleepingPowder: {
		duration: 5000,
		stackable: false,
		mods: [
			{ stat: 'attackSpeed', type: ModType.Percent, stage: ModStage.Base, value: -50 },
			{ stat: 'speed', type: ModType.Percent, stage: ModStage.Base, value: -30 },
		],
	},
	honeySpot: {
		duration: 5000,
		stackable: false,
		mods: [
			{ stat: 'speed', type: ModType.Percent, stage: ModStage.Total, value: -50 },
		],
	},
	cookie: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'maxHealth', value: 1, stage: ModStage.Total, type: ModType.Add },
		],
	},
	roasted_carrot: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: 0.2 },
		],
	},
	carrot_soup: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'lootChance', stage: ModStage.Base, type: ModType.Percent, value: 50 },
		],
	},
	tomato_soup: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'lootQuantity', stage: ModStage.Base, type: ModType.Add, value: 1 },
		],
	},
	honey_glazed_carrot: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: -0.5 },
			{ stat: 'maxHealth', stage: ModStage.Total, type: ModType.Add, value: 1 },
		],
	},
	beetroot_salad: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: 2 },
			{ stat: 'critDamage', stage: ModStage.Base, type: ModType.Add, value: -0.05 },
		],
	},
	ham_honey: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'maxHealth', stage: ModStage.Base, type: ModType.Add, value: 3 },
		],
	},
	slime_bread: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'maxHealth', stage: ModStage.Base, type: ModType.Add, value: 1 },
		],
	},
	slime_dumpling: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: 0.5 },
			{ stat: 'maxHealth', stage: ModStage.Base, type: ModType.Add, value: -1 },
		],
	},
	carrot_cake: {
		duration: null,
		stackable: true,
		mods: [],
	},
	pumpkin_bread: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'maxHealth', stage: ModStage.Base, type: ModType.Add, value: -1 },
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: 2 },
			{ stat: 'lootChance', stage: ModStage.Base, type: ModType.Add, value: -1 },
		],
	},
	flan: {
		duration: null,
		stackable: true,
		mods: [],
	},
	pumpkin_bowl: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'strength', stage: ModStage.Base, type: ModType.Add, value: 1 },
			{ stat: 'maxHealth', stage: ModStage.Base, type: ModType.Add, value: 2 },
			{ stat: 'critChance', stage: ModStage.Base, type: ModType.Percent, value: -0.5 },
		],
	},
	strawberry_pie: {
		duration: null,
		stackable: true,
		mods: [],
	},
	hummus: {
		duration: null,
		stackable: true,
		mods: [
			{ stat: 'lootQuantity', stage: ModStage.Base, type: ModType.Add, value: 1 },
			{ stat: 'lootChance', stage: ModStage.Base, type: ModType.Percent, value: 0.5 },
		],
	},

}

export class ModifierContainer {
	toAdd = new Set<Modifiers>()
	added = new Set<Modifiers>()
	modifiers = new Set<{ name: Modifiers, duration: Timer<false> | null }>()
	removed = new Set<Modifiers>()
	hasModifier(key: Modifiers) {
		for (const mod of this.modifiers) {
			if (mod.name === key) {
				return true
			}
		}
		return false
	}

	addModifier(key: Modifiers) {
		const mod = modifiers[key]
		if (mod.stackable || !this.hasModifier(key)) {
			const duration = mod.duration ? new Timer(mod.duration, false) : null
			this.modifiers.add({ name: key, duration })
			this.toAdd.add(key)
		}
	}

	removeModifiers(key: Modifiers) {
		for (const mod of this.modifiers) {
			if (mod.name === key) {
				this.modifiers.delete(mod)
			}
		}
	}

	getMods(stat: ComponentsOfType<Stat>) {
		return Array.from(this.modifiers).flatMap(({ name }) => modifiers[name].mods.filter(mod => mod.stat === stat))
	}

	tick(delta: number) {
		this.added = new Set(this.toAdd)
		this.toAdd.clear()
		this.removed.clear()
		for (const mod of this.modifiers) {
			if (mod.duration) {
				mod.duration.tick(delta)
				if (mod.duration.finished()) {
					this.modifiers.delete(mod)
					this.removed.add(mod.name)
				}
			}
		}
	}
}

const modifiersQuery = ecs.with('modifiers')
export const tickModifiersPlugin = (...stats: AllComponentsOfType<Stat>) => (s: State) => {
	s.onPreUpdate(() => {
		for (const entity of modifiersQuery) {
			entity.modifiers.tick(time.delta)
			for (const stat of stats) {
				const statComponent = entity[stat]
				if (statComponent) {
					statComponent.modifiers = entity.modifiers.getMods(stat)
				}
			}
		}
	})
	s.addSubscriber(() => modifiersQuery.onEntityAdded.subscribe((entity) => {
		entity.modifiers.tick(time.delta)
		for (const stat of stats) {
			const statComponent = entity[stat]
			if (statComponent) {
				statComponent.modifiers = entity.modifiers.getMods(stat)
			}
		}
	}))
}
