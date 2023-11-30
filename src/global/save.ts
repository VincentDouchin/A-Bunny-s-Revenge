import { get, set } from 'idb-keyval'
import { context } from './context'
import { ecs } from './init'

interface CropData {
	name: 'carrot'
	stage: number
	x: number
	z: number
}
interface SaveData {
	crops: CropData[]
}

const blankSave = (): SaveData => ({
	crops: [],
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