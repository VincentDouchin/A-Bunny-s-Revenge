import type { With } from 'miniplex'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { spawnAcorns } from './acorn'
import { type Drop, type enemy, enemyData } from '@/constants/enemies'
import { type Item, itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { save } from '@/global/save'
import { entries, getRandom, range } from '@/utils/mapFunctions'
import type { Subscriber } from '@/lib/state'
import type { DungeonRessources } from '@/global/states'
import { ecs } from '@/global/init'

export const lootPool = (lootQuantity: number, lootRarity: number, drops: Drop[], recipes: Drop[]) => {
	const pool: Omit<Drop, 'quantity'>[] = drops.flatMap(drop => range(0, drop.quantity, () => ({ name: drop.name, rarity: drop.rarity })))
	const extraLoot = Math.floor(lootQuantity) + Math.random() < lootQuantity % 1 ? 1 : 0
	pool.push(...range(0, extraLoot).map(() => getRandom(drops)))
	if (recipes.length > 0) {
		pool.push(getRandom(recipes))
	}
	const loot: Item[] = []
	for (const possibleLoot of pool) {
		const roll = Math.random() * 100
		const chance = possibleLoot.rarity + (lootRarity * 100)
		if (roll < chance) {
			const item: Item = { name: possibleLoot.name, quantity: 1 }
			if (possibleLoot.recipe) item.recipe = possibleLoot.recipe
			loot.push(item)
		}
	}
	return loot
}
export const chestLootPool = (level: number, boss: boolean, player: With<Entity, 'lootQuantity' | 'lootChance'>) => {
	const possibleItems: Drop[] = []
	const possibleRecipes: Drop[] = []
	for (const [name, data] of entries(itemsData)) {
		if (data.drop) {
			if (data.drop.recipe) {
				if (Boolean(data.drop.boss) === boss && !save.unlockedRecipes.includes(name)) {
					possibleRecipes.push({ name: 'recipe', rarity: data.drop.rarity, quantity: 1, recipe: name })
				}
			} else if (data.drop.level <= level) {
				possibleItems.push({ name, rarity: data.drop.rarity, quantity: 1 })
			}
		}
	}
	const drops = range(0, between(3, 5), () => getRandom(possibleItems))

	const items = lootPool(player.lootQuantity.value, player.lootChance.value, drops, possibleRecipes)
	return items
}
export const enemyLootPool = (level: number, enemy: enemy, player: With<Entity, 'lootQuantity' | 'lootChance'>) => {
	const possibleItems: Drop[] = enemyData[enemy].drops
	const possibleRecipes: Drop[] = []
	for (const [name, data] of entries(itemsData)) {
		if (data.drop) {
			if (data.drop.level === level && enemyData[enemy].boss === data.drop.boss && !save.unlockedRecipes.includes(name)) {
				possibleRecipes.push({ name: 'recipe', rarity: data.drop.rarity, quantity: 1, recipe: name })
			}
		}
	}
	const items = lootPool(player.lootQuantity.value, player.lootChance.value, possibleItems, possibleRecipes)

	return items
}

export const dropBundle = (drop: Item) => {
	const bundle: Entity = itemBundle(drop.name)
	if (drop.recipe) {
		bundle.recipe = drop.recipe
	}
	return bundle
}
const enemyDropsQuery = ecs.with('enemyName', 'position')
const playerQuery = ecs.with('player', 'lootChance', 'lootQuantity')
export const spawnDrops: Subscriber<DungeonRessources> = ressources => enemyDropsQuery.onEntityRemoved.subscribe((e) => {
	const player = playerQuery.first
	if (player) {
		spawnAcorns(between(2, 5), e.position)

		for (const drop of enemyLootPool(ressources.dungeonLevel, e.enemyName, player)) {
			ecs.add({ ...dropBundle(drop), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})