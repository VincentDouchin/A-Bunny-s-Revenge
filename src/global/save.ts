import { get, set } from 'idb-keyval'
import { Quaternion, Vector3 } from 'three'
import { context } from './context'
import type { crops } from './entity'
import type { Item } from '@/constants/items'
import type { QuestName } from '@/constants/quests'

export interface SaveData {
	crops: Record<string, { stage: number, name: crops }>
	items: Record<number, Item>
	playerPosition: number[]
	playerRotation: number[]
	quests: Partial<Record<QuestName, Array<boolean>>>
}

const blankSave = (): SaveData => ({
	crops: {},
	items: [],
	playerPosition: new Vector3().toArray(),
	playerRotation: new Quaternion().toArray(),
	quests: {},
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

export const addItem = (item: Item, save = true) => {
	updateSave((s) => {
		const existingItem = Object.values(s.items).find(i => i.name === item.name)
		if (existingItem) {
			existingItem.quantity += item.quantity }
		else {
			for (let i = 0; i < 24; i++) {
				if (s.items[i] === undefined) {
					s.items[i] = item
					break
				}
			}
		}
	}, save)
}
export const removeItem = (item: Item, save = true) => {
	updateSave((s) => {
		const existingItemIndex = Object.values(s.items).findIndex(i => i.name === item.name)
		const existingItem = s.items[existingItemIndex]
		if (existingItem) {
			existingItem.quantity -= item.quantity
			if (existingItem.quantity <= 0) {
				delete s.items[existingItemIndex]
			}
		}
	}, save)
}