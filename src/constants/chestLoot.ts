import type { Drop } from './enemies'
import { Rarity } from './items'

interface ChestLoot {
	level: number
	quantity: number
	items: Drop[]
}
export const chestLoot: ChestLoot[] = [{
	level: 0,
	quantity: 5,
	items: [
		{ name: 'carrot_seeds', quantity: 2, rarity: Rarity.Common },
		{ name: 'tomato_seeds', quantity: 1, rarity: Rarity.Common },
		{ name: 'lettuce_seeds', quantity: 1, rarity: Rarity.Common },
		{ name: 'beet_seeds', quantity: 1, rarity: Rarity.Common },
		{ name: 'recipe', recipe: 'tomato_soup', quantity: 1, rarity: Rarity.Common },
		{ name: 'recipe', recipe: 'honey_glazed_carrot', quantity: 1, rarity: Rarity.Common },
		{ name: 'recipe', recipe: 'ham_honey', quantity: 1, rarity: Rarity.Rare },
		{ name: 'recipe', recipe: 'slime_bread', quantity: 1, rarity: Rarity.Rare },
		{ name: 'recipe', recipe: 'slime_dumpling', quantity: 1, rarity: Rarity.Rare },
	],

}]