import type { Object3D } from 'three/webgpu'
import { isObject3D } from '@tresjs/core'
import { defineStore } from 'pinia'
import { loadAssets } from '@/global/assets'
import { Thumbnailer } from '@/lib/thumbnailRenderer'

export type EditorAssets = Awaited<ReturnType<typeof loadAssets>>

export const useAssetStore = defineStore('assets', () => {
	const models = shallowRef<Record<string, Record<string, Object3D>>>({})
	const assets = shallowRef<EditorAssets | null>(null)
	const init = async () => {
		const thumbnailRenderer = await Thumbnailer.create(128)
		assets.value = await loadAssets(thumbnailRenderer, true)
		for (const key in assets.value) {
			const category = assets.value[key as keyof typeof assets['value']]
			const cat = category as unknown as Record<string, any>
			for (const asset in cat) {
				const obj = cat[asset] as unknown as any
				if (typeof obj == 'object' && 'scene' in obj && isObject3D(obj.scene)) {
					models.value[key] ??= {}
					models.value[key][asset] = obj.scene
				}
				if (isObject3D(obj)) {
					models.value[key] ??= {}
					models.value[key][asset] ??= obj
				}
			}
		}
	}
	return { models, assets, init }
})