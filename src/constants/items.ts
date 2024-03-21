import type { items } from '@assets/assets'
import type { crops } from '@/global/entity'
import { ModStage, ModType, type Modifier, createModifier } from '@/lib/stats'

export interface Item {
	name: items
	quantity: number
}

export interface ItemData {
	name: string
	seed?: crops
	meal?: Modifier<any>[]
	ingredient?: true
}

export const itemsData: Record<items, ItemData> = {
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
	roasted_carrot: {
		name: 'Roasted carrot',
		meal: [
			createModifier('strength', 1, ModStage.Base, ModType.Percent, true),
		],
	},
	carrot_soup: {
		name: 'Carrot soup',
		meal: [
			createModifier('maxHealth', 20, ModStage.Add, ModType.Percent, true),
			createModifier('strength', -2, ModStage.Total, ModType.Percent, true),
		],
	},
	tomato_soup: {
		name: 'Tomato soup',
		meal: [
			createModifier('maxHealth', 20, ModStage.Add, ModType.Percent, true),
			createModifier('strength', -2, ModStage.Total, ModType.Percent, true),
		],
	},
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
	lettuce: {
		name: 'Lettuce',
		ingredient: true,
	},
	honey: {
		name: 'Honey',
		ingredient: true,
	},
	honey_glazed_carrot: {
		name: 'Honey glazed carrot',
		meal: [
			createModifier('strength', 2, ModStage.Base, ModType.Percent, true),
			createModifier('maxHealth', 1, ModStage.Total, ModType.Add, true),
		],
	},
	parsley: {
		name: 'Parsley',
		ingredient: true,
	},
	beetroot_salad: {
		name: 'Beetroot Salad',
		meal: [
			createModifier('strength', 2, ModStage.Base, ModType.Add, false),
			createModifier('critDamage', -0.05, ModStage.Base, ModType.Add, false),
		],
	},
	ham: {
		name: 'Ham',
		ingredient: true,
	},
	ham_honey: {
		name: 'Honey Ham',
		meal: [
			createModifier('maxHealth', 3, ModStage.Base, ModType.Add, true),
		],
	},
	slime_dough: {
		name: 'Slime Dough',
		ingredient: true,
	},
	slime_bread: {
		name: 'Slime Bread',
		meal: [
			createModifier('critChance', 0.5, ModStage.Total, ModType.Add, false),
		],
	},
	slime_dumpling: {
		name: 'Slime Dumpling',
		meal: [],
	},
	magic_bean: {
		name: '"Magic" bean',
		ingredient: true,
	},
	milk: {
		name: 'Milk',
		ingredient: true,
	},
	pumpkin_seeds: {
		name: 'Pumpkin seeds',
		seed: 'pumpkin',
	},
	pumpkin: {
		name: 'Pumpkin',
		ingredient: true,
	},
	egg: {
		name: 'Egg',
		ingredient: true,
	},
	carrot_cake: {
		name: 'Carrot cake',
		meal: [],
	},
	cinnamon: {
		name: 'Cinnamon',
		ingredient: true,
	},
	wheat_seeds: {
		name: 'Wheat seeds',
		seed: 'wheat',
	},
	wheat: {
		name: 'Wheat',
		ingredient: true,
	},
	flour: {
		name: 'Flour',
		ingredient: true,
	},
	butter: {
		name: 'Butter',
		ingredient: true,
	},
	pumpkin_bread: {
		name: 'Pumpkin bread',
		meal: [],
	},
	sugar: {
		name: 'Sugar',
		ingredient: true,
	},
	flan: {
		name: 'Flan',
		meal: [],
	},

}
