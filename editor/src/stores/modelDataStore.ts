import type { AssetData } from '../types'
import { get, set } from 'idb-keyval'
import { defineStore } from 'pinia'
import { loadBoundingBox } from '../lib/fileOperations'

export const useModelDataStore = defineStore('modelData', () => {
	const key = 'modelData'
	const modelData = ref<Record<string, Record<string, AssetData>>>({})
	const init = async () => {
		const existingValue = await get(key)
		modelData.value = existingValue ?? (await loadBoundingBox())
	}
	watchDebounced(
		modelData,
		(val) => {
			set(key, toRaw(val))
		},
		{ debounce: 1000, deep: true },
	)
	return { init, modelData }
})
