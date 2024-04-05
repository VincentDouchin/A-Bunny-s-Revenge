import { get, set } from 'idb-keyval'
import { Quaternion, Vector3 } from 'three'
import type { With } from 'miniplex'
import { context } from './context'
import type { Entity, crops } from './entity'
import type { QuestName } from '@/constants/quests'
import type { Item } from '@/constants/items'

export interface SaveData {
	crops: Record<string, { stage: number, name: crops }>
	playerPosition: number[]
	playerRotation: number[]
	quests: Partial<Record<QuestName, Array<boolean>>>
	selectedSeed: null | crops
	inventories: Record<string, Item[]>
	modifiers: string[]
	settings: { volume: number, mute: boolean, fullscreen: boolean | null }
	unlockedPaths: number
	acorns: number
}

const blankSave = (): SaveData => ({
	crops: {},
	playerPosition: new Vector3().toArray(),
	playerRotation: new Quaternion().toArray(),
	quests: {},
	selectedSeed: null,
	inventories: {},
	modifiers: [],
	settings: { volume: 100, mute: false, fullscreen: null },
	unlockedPaths: 1,
	acorns: 0,
})

export const save: Readonly<SaveData> = blankSave()

export const getSave = async () => {
	const saveName = context.save
	const data = await get<SaveData>(saveName)
	if (data) {
		Object.assign(save, data)
	}
}
export const updateSave = async (saveFn: (save: SaveData) => void, saved = true) => {
	saveFn(save)
	saved && await set(context.save, save)
}
export const resetSave = async (newSave?: SaveData) => {
	await set(context.save, newSave ?? blankSave())
}

export const addItem = (entity: With<Entity, 'inventoryId' | 'inventory' | 'inventorySize'>, item: Item, stack = true) => {
	let wasAdded = false
	updateSave((s) => {
		const inventory = s.inventories[entity.inventoryId]
		const existingItem = inventory.find(it => it && it.name === item.name && stack)
		if (existingItem) {
			wasAdded = true
			existingItem.quantity += item.quantity
		} else {
			for (let i = 0; i < entity.inventorySize; i++) {
				if (inventory[i] === undefined) {
					inventory[i] = item
					wasAdded = true
					break
				}
			}
		}
	})
	return wasAdded
}
export const removeItem = (entity: With<Entity, 'inventoryId' | 'inventory' | 'inventorySize'>, item: Item, slot?: number) => {
	updateSave((s) => {
		const inventory = s.inventories[entity.inventoryId]
		const existingItemIndex = inventory.findIndex((it, i) => it && it.name === item.name && (slot === undefined || i === slot))
		const existingItem = inventory[existingItemIndex]
		if (existingItem) {
			existingItem.quantity -= item.quantity
			if (existingItem.quantity <= 0) {
				delete inventory[existingItemIndex]
			}
		}
	})
}