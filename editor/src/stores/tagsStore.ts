import type { EditorTags } from '../types'
import { get, set } from 'idb-keyval'
import { defineStore } from 'pinia'
import { loadTagsList } from '../lib/fileOperations'

export const useTagsStore = defineStore('tags', () => {
	const tagsList = ref<EditorTags | null>(null)
	const key = 'tagsList'
	const init = async () => {
		const existingValue = await get(key)
		tagsList.value = existingValue ?? await loadTagsList()
	}
	watchDebounced(tagsList, (val) => {
		set(key, toRaw(val))
	}, { debounce: 1000, deep: true })
	return { tagsList, init }
})