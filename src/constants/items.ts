import type { items } from '@assets/assets'
import { ModStage, ModType, type Modifier, createModifier } from '@/lib/stats'
import { entries, shuffle } from '@/utils/mapFunctions'
import { save } from '@/global/save'

export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce', 'pumpkin', 'wheat', 'haricot', 'magic_bean'] as const satisfies readonly items[]
export const fruitNames = ['apple'] as const
export type crops = (typeof cropNames)[number]
export type fruits = (typeof fruitNames)[number]
export interface Item {
	name: items
	quantity: number
	recipe?: items
	health?: number
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
	'key item'?: true
	'price'?: number
	'health'?: number
}

export const itemsData: Record<items, ItemData> = {
	acorn: {
		name: 'Acorn',
	},
	Heart: {
		name: 'Heart',
		health: 1,
	},
	// ! Ingredients
	redSnapper: {
		name: 'Red snapper',
		ingredient: true,
	},
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
	},
	beet_seeds: {
		name: 'Beet seed',
		seed: 'beet',
	},
	tomato_seeds: {
		name: 'Tomato seeds',
		seed: 'tomato',
	},
	lettuce_seeds: {
		name: 'Lettuce seeds',
		seed: 'lettuce',
	},
	pumpkin_seeds: {
		name: 'Pumpkin seeds',
		seed: 'pumpkin',
		price: 10,
	},
	wheat_seeds: {
		name: 'Wheat seeds',
		seed: 'wheat',
	},
	// ! Chest Loot
	egg: {
		name: 'Egg',
		ingredient: true,

	},
	cinnamon: {
		name: 'Cinnamon',
		ingredient: true,
		price: 10,
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
	// ? GRANDMA QUEST
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('roasted_carrot', 'strength', 0.2, ModStage.Base, ModType.Add, true),
			],
		},
	},
	// ? JACk QUEST
	carrot_soup: {
		name: 'Carrot soup',
		meal: {
			amount: 2,
			modifiers: [
				createModifier('carrot_soup', 'lootChance', 0.5, ModStage.Base, ModType.Percent, true),
			],
		},
	},
	tomato_soup: {
		name: 'Tomato soup',
		meal: {
			amount: 2,
			modifiers: [
				createModifier('carrot_soup', 'lootQuantity', 1, ModStage.Base, ModType.Add, true),
			],
		},

	},
	honey_glazed_carrot: {
		name: 'Honey glazed carrot',
		meal: {
			amount: 1,
			modifiers: [
				createModifier('honey_glazed_carrot', 'strength', -0.5, ModStage.Base, ModType.Add, true),
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
			amount: 2,
			modifiers: [
				createModifier('ham_honey', 'maxHealth', 3, ModStage.Base, ModType.Add, true),
			],
		},

	},
	slime_bread: {
		name: 'Slime Bread',
		meal: {
			amount: 1.5,
			modifiers: [
				createModifier('slime_dumpling', 'maxHealth', 1, ModStage.Base, ModType.Add, true),
			],
		},
	},
	slime_dumpling: {
		name: 'Slime Dumpling',
		meal: {
			amount: 2,
			modifiers: [
				createModifier('slime_dumpling', 'strength', 0.5, ModStage.Base, ModType.Add, true),
				createModifier('slime_dumpling', 'maxHealth', -2, ModStage.Base, ModType.Add, true),
			],
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
			modifiers: [
				createModifier('pumpkin_bowl', 'strength', 2, ModStage.Base, ModType.Add, true),
				createModifier('pumpkin_bowl', 'maxHealth', -1, ModStage.Base, ModType.Add, true),
				createModifier('pumpkin_bowl', 'lootChance', -1, ModStage.Base, ModType.Add, true),
			],
		},
		price: 30,
	},
	flan: {
		name: 'Pudding',
		meal: {
			amount: 1.5,
			modifiers: [
				// createModifier('pudding', 'attackSpeed', 0.1, ModStage.Total, ModType.Add, false),
			],
		},
	},
	pumpkin_bowl: {
		name: 'Stuffed pumpkin',
		meal: {
			amount: 3,
			modifiers: [
				createModifier('pumpkin_bowl', 'strength', 1, ModStage.Base, ModType.Add, true),
				createModifier('pumpkin_bowl', 'maxHealth', 2, ModStage.Base, ModType.Add, true),
				createModifier('pumpkin_bowl', 'critChance', -0.5, ModStage.Base, ModType.Percent, true),
			],
		},
		price: 50,
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
			modifiers: [
				createModifier('pumpkin_bowl', 'lootQuantity', 1, ModStage.Base, ModType.Add, true),
				createModifier('pumpkin_bowl', 'lootChance', 0.5, ModStage.Base, ModType.Percent, true),
			],
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

export const getSellableItems = (amount: number) => {
	const items: Item[] = []
	for (const [name, { price, meal }] of entries(itemsData)) {
		if (!price) continue
		if (meal) {
			if (!save.unlockedRecipes.includes(name)) {
				items.push({ name: 'recipe', quantity: 1, recipe: name })
			}
		} else {
			items.push({ name, quantity: 1 })
		}
	}
	const shuffled = shuffle(items)
	return shuffled.splice(0, amount)
}