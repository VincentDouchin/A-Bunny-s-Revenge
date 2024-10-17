import type { items } from '@assets/assets'
import { save } from '@/global/init'
import { modifiers } from '@/global/modifiers'
import { entries, shuffle } from '@/utils/mapFunctions'

export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce', 'pumpkin', 'wheat', 'haricot', 'magic_bean', 'potato'] as const satisfies readonly items[]
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
	'meal'?: number
	'ingredient'?: true
	'key item'?: true
	'price'?: number
	'health'?: number
}

export const itemsData = {
	acorn: {
		name: 'Acorn',
	},
	recipe_book: {
		'name': 'Recipe book',
		'key item': true,
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
	lemon: {
		name: 'Lemon',
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
	potato: {
		name: 'Potato',
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
	potato_seeds: {
		name: 'Potato seeds',
		seed: 'potato',
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
		meal: 0.5,
	},
	// ? GRANDMA QUEST
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: 1,
	},
	// ? JACK QUEST
	carrot_soup: {
		name: 'Carrot soup',
		meal: 2,
	},
	tomato_soup: {
		name: 'Tomato soup',
		meal: 2,

	},
	honey_glazed_carrot: {
		name: 'Honey glazed carrot',
		meal: 1,

	},
	beetroot_salad: {
		name: 'Beetroot Salad',
		meal: 1,
	},
	ham_honey: {
		name: 'Honey Ham',
		meal: 2,

	},
	slime_bread: {
		name: 'Slime Bread',
		meal: 1.5,
	},
	slime_dumpling: {
		name: 'Slime Dumpling',
		meal: 1.5,
	},
	carrot_cake: {
		name: 'Carrot cake',
		meal: 2,
	},
	pumpkin_bread: {
		name: 'Pumpkin bread',
		meal: 1.5,
		price: 30,
	},
	flan: {
		name: 'Pudding',
		meal: 1.5,
	},
	pumpkin_bowl: {
		name: 'Stuffed pumpkin',
		meal: 3,
		price: 50,
	},
	strawberry_pie: {
		name: 'Strawberry pie',
		meal: 2,
	},
	magic_bean: {
		'name': '"Magic" bean',
		'key item': true,
	},
	recipe: {
		'name': 'Recipe',
		'key item': true,
	},
	hummus: {
		name: 'Hummus',
		meal: 3,
	},
} as const satisfies Record<items, ItemData>

export type Meals = { [k in keyof typeof itemsData]: (typeof itemsData)[k] extends { meal: any } ? k : never }[keyof typeof itemsData]

export const isMeal = (item: items): item is Meals => item in modifiers
export const getSeed = (item: items) => {
	const itemData = itemsData[item]
	if ('seed' in itemData) {
		return itemData.seed
	}
}
export const getSellableItems = (amount: number) => {
	const items: Item[] = []
	for (const [name, item] of entries(itemsData)) {
		if (!('price' in item)) continue
		if ('meal' in item) {
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