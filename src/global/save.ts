import { get, set } from 'idb-keyval'
import { context } from './context'
import { ecs } from './init'
import type { ItemData } from '@/constants/items'

interface CropData {
	name: 'carrot'
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
export const updateSave = async (saveFn: (save: SaveData) => void) => {
	saveFn(save)
	await set(context.save, save)
}

const cropsQuery = ecs.with('crop', 'position')
export const saveCrops = () => {
	updateSave((s) => {
		s.crops = [...cropsQuery].map(({ crop, position }) => ({ ...crop, x: position.x, z: position.z }))
	})
}
export const addItem = (item: ItemData) => {
	updateSave((s) => {
		const existingItem = s.items.find(i => i.icon === item.icon)
		if (existingItem)existingItem.quantity += item.quantity
		else s.items.push(item)
	})
}