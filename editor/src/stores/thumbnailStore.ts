import type { Object3D } from 'three/webgpu'
import { createStore, entries, keys, set } from 'idb-keyval'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadImage } from '@/global/assetLoaders'
import { Thumbnailer } from '@/lib/thumbnailRenderer'
import { imgToCanvas } from '@/utils/buffer'

export const useThumbnailStore = defineStore('thumbnail', () => {
	const thumbnailer = ref<Thumbnailer | null>(null)
	const store = createStore('thumbnails', 'thumbnails')
	const cache = ref<Record<string, HTMLCanvasElement>>({})
	const getThumbnail = async (key: string, model: Object3D) => {
		const existingValue = cache.value[key]
		if (existingValue) {
			return existingValue
		} else if (thumbnailer.value) {
			const canvas = thumbnailer.value.getCanvas(model, true, 1)
			const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
			if (blob) {
				set(key, blob, store)
			}
			return canvas
		}
	}
	const init = async () => {
		thumbnailer.value = await Thumbnailer.create(128)
		for (const [key, blob] of await entries(store)) {
			const url = URL.createObjectURL(blob)
			const img = await loadImage(url)
			const canvas = imgToCanvas(img).canvas
			cache.value[key as string] = canvas
		}
	}
	return {
		init,
		getThumbnail,
	}
})