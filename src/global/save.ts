import { get, set } from 'idb-keyval'
import { context } from './context'
import type { crops } from './entity'
import type { ItemData } from '@/constants/items'

interface CropData {
	name: crops
	stage: number
	x: number
	z: number
}
interface SaveData {
	crops: CropData[]
	items: ItemData[]
}

const blankSave = (): SaveData => ({
	crops: [],
	items: [],
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

export const addItem = (item: ItemData, save = true) => {
	updateSave((s) => {
		const existingItem = s.items.find(i => i.icon === item.icon)
		if (existingItem)existingItem.quantity += item.quantity
		else s.items.push(item)
	}, save)
}