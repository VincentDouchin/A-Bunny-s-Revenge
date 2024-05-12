import type { items } from '@assets/assets'
import { ModStage, ModType, type Modifier, createModifier } from '@/lib/stats'
import { entries } from '@/utils/mapFunctions'

export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce', 'pumpkin', 'wheat', 'haricot', 'magic_bean'] as const satisfies readonly items[]
export const fruitNames = ['apple'] as const
export type crops = (typeof cropNames)[number]
export type fruits = (typeof fruitNames)[number]
export interface Item {
	name: items
	quantity: number
}

export enum Rarity {
	Common = 50,
	Rare = 25,
	Always = 100,
}
export interface ItemData {
	'name': string
	'seed'?: crops
	'meal'?: {
		amount: number
		modifiers: Modifier<any>[]
	}
	'ingredient'?: true
	'drop'?: {
		rarity: Rarity
		level: 0 | 1 | 2 | 3
	}
	'key item'?: true
	'price'?: number
}

export const itemsData: Record<items, ItemData> = {
	acorn: {
		name: 'Acorn',
	},
	// ! Ingredients
	haricot: {
		name: 'Haricot',
		ingredient: true,
	},
	strawberry: {
		name: 'Strawberry',
		ingredient: true,
	},
	beet: {
		name: 'Beet',
		ingredient: true,
	},
	carrot: {
		name: 'Carrot',
		ingredient: true,
	},
	tomato: {
		name: 'Tomato',
		ingredient: true,
	},
	lettuce: {
		name: 'Lettuce',
		ingredient: true,
	},
	honey: {
		name: 'Honey',
		ingredient: true,

	},
	parsley: {
		name: 'Parsley',
		ingredient: true,
	},
	ham: {
		name: 'Ham',
		ingredient: true,
	},
	steak: {
		name: 'Snail Steak',
		ingredient: true,
	},
	slime_dough: {
		name: 'Slime Dough',
		ingredient: true,
	},
	pumpkin: {
		name: 'Pumpkin',
		ingredient: true,
	},
	milk: {
		name: 'Milk',
		ingredient: true,
		price: 7,
	},
	wheat: {
		name: 'Wheat',
		ingredient: true,
	},
	flour: {
		name: 'Flour',
		ingredient: true,
		price: 5,
	},
	butter: {
		name: 'Butter',
		ingredient: true,
		price: 10,
	},
	sugar: {
		name: 'Sugar',
		ingredient: true,
	},
	// ! Seeds
	carrot_seeds: {
		name: 'Carrot seed',
		seed: 'carrot',
		drop: {
			rarity: Rarity.Common,
			level: 0,
		},
	},
	beet_seeds: {
		name: 'Beet seed',
		seed: 'beet',
		drop: {
			rarity: Rarity.Common,
			level: 0,
		},
	},
	tomato_seeds: {
		name: 'Tomato seeds',
		seed: 'tomato',
		drop: {
			rarity: Rarity.Common,
			level: 0,
		},
	},
	lettuce_seeds: {
		name: 'Lettuce seeds',
		seed: 'lettuce',
		drop: {
			rarity: Rarity.Common,
			level: 0,
		},
	},
	pumpkin_seeds: {
		name: 'Pumpkin seeds',
		seed: 'pumpkin',
		drop: {
			rarity: Rarity.Common,
			level: 1,
		},
	},
	wheat_seeds: {
		name: 'Wheat seeds',
		seed: 'wheat',
		drop: {
			rarity: Rarity.Common,
			level: 1,
		},
	},
	// ! Chest Loot
	egg: {
		name: 'Egg',
		ingredient: true,
		drop: {
			level: 1,
			rarity: Rarity.Common,
		},
	},
	cinnamon: {
		name: 'Cinnamon',
		ingredient: true,
		drop: {
			level: 1,
			rarity: Rarity.Rare,
		},
	},
	// ! Meals
	cookie: {
		name: 'Cookie',
		meal: {
			amount: 0.5,
			modifiers: [
				createModifier('cookie', 'maxHealth', 1, ModStage.Total, ModType.Add, false),
			],
		},
	},
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('roasted_carrot', 'strength', 1, ModStage.Base, ModType.Percent, true),
			],
		},
	},
	carrot_soup: {
		name: 'Carrot soup',
		meal: {
			amount: 1.5,
			modifiers: [
				createModifier('carrot_soup', 'maxHealth', 20, ModStage.Add, ModType.Percent, true),
				createModifier('carrot_soup', 'strength', -2, ModStage.Total, ModType.Percent, true),
			],
		},
	},
	tomato_soup: {
		name: 'Tomato soup',
		meal: {
			amount: 1.5,
			modifiers: [
				createModifier('tomato_soup', 'maxHealth', 20, ModStage.Add, ModType.Percent, true),
				createModifier('tomato_soup', 'strength', -2, ModStage.Total, ModType.Percent, true),
			],
		},
	},
	honey_glazed_carrot: {
		name: 'Honey glazed carrot',
		meal: {
			amount: 1.5,
			modifiers: [
				createModifier('honey_glazed_carrot', 'strength', 2, ModStage.Base, ModType.Percent, true),
				createModifier('honey_glazed_carrot', 'maxHealth', 1, ModStage.Total, ModType.Add, true),
			],
		},
	},
	beetroot_salad: {
		name: 'Beetroot Salad',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('beetroot_salad', 'strength', 2, ModStage.Base, ModType.Add, false),
				createModifier('beetroot_salad', 'critDamage', -0.05, ModStage.Base, ModType.Add, false),
			],
		},
	},
	ham_honey: {
		name: 'Honey Ham',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('ham_honey', 'maxHealth', 3, ModStage.Base, ModType.Add, true),
			],
		},
	},
	slime_bread: {
		name: 'Slime Bread',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('slime_bread', 'critChance', 0.5, ModStage.Total, ModType.Add, false),
			],
		},
	},
	slime_dumpling: {
		name: 'Slime Dumpling',
		meal: {
			amount: 1,
			modifiers: [],
		},
	},
	carrot_cake: {
		name: 'Carrot cake',
		meal: {
			amount: 2,
			modifiers: [],
		},
	},
	pumpkin_bread: {
		name: 'Pumpkin bread',
		meal: {
			amount: 1.5,
			modifiers: [],
		},
	},
	flan: {
		name: 'Pudding',
		meal: {
			amount: 1.5,
			modifiers: [
				createModifier('pudding', 'attackSpeed', 0.1, ModStage.Total, ModType.Add, false),
			],
		},
	},
	pumpkin_bowl: {
		name: 'Stuffed pumpkin',
		meal: {
			amount: 3,
			modifiers: [],
		},
	},
	strawberry_pie: {
		name: 'Strawberry pie',
		meal: {
			amount: 2,
			modifiers: [],
		},
	},
	hummus: {
		name: 'Hummus',
		meal: {
			amount: 3,
			modifiers: [],
		},
	},
	magic_bean: {
		'name': '"Magic" bean',
		'key item': true,
	},
	recipe: {
		'name': 'Recipe',
		'key item': true,
	},
}

export const sellableItems = entries(itemsData).reduce((acc, [name, { price }]) => price ? [...acc, name] : acc, [] as items[])