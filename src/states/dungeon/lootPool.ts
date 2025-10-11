import type { With } from 'miniplex'
import type { Drop } from '@/constants/enemies'
import type { Item } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { ecs, save } from '@/global/init'
import { getRandom, range, shuffle } from '@/utils/mapFunctions'
import { itemBundle } from '../game/items'
import { spawnAcorns } from './acorn'

export const lootPool = (drops: Drop[], player: With<Entity, 'lootChance' | 'lootQuantity'>, quantity?: number) => {
	const lootQuantity = player.lootQuantity.value
	const lootChance = player.lootChance.value
	const possibleRecipes = drops.filter(drop => drop.recipe && !save.unlockedRecipes.includes(drop.recipe))
	const possibleItems = drops.filter(drop => !drop.recipe)
	const extraLoot = Math.floor(lootQuantity) + Math.random() < lootQuantity % 1 ? 1 : 0
	const pool: Drop[] = possibleItems.flatMap(drop => range(0, drop.quantity, () => ({ name: drop.name, rarity: drop.rarity, quantity: 1, health: drop.health })))
	pool.push(...range(0, extraLoot).map(() => getRandom(drops)))
	const limitedPool = quantity ? shuffle(pool).slice(0, quantity) : pool
	const loot: Item[] = []
	if (possibleRecipes.length > 0) {
		limitedPool.push(getRandom(possibleRecipes))
	}
	for (const item of limitedPool) {
		const roll = Math.random() * 100
		const chance = item.rarity + (lootChance * 100)
		if (roll < chance) {
			loot.push(item)
		}
	}
	return loot
}

export const dropBundle = (drop: Item) => {
	const bundle: Entity = itemBundle(drop.name)
	if (drop.recipe) bundle.recipe = drop.recipe
	if (drop.health) bundle.health = drop.health
	return bundle
}
const enemyDropsQuery = ecs.with('position', 'drops')
const playerQuery = ecs.with('player', 'lootChance', 'lootQuantity')
export const spawnDrops = () => enemyDropsQuery.onEntityRemoved.subscribe((e) => {
	const player = playerQuery.first
	if (player) {
		spawnAcorns(between(2, 5), e.position)

		for (const drop of lootPool(e.drops, player)) {
			ecs.add({ ...dropBundle(drop), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})