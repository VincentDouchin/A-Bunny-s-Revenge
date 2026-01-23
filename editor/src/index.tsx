import { onMount, Show } from 'solid-js'
import { createMutable } from 'solid-js/store'
import { render } from 'solid-js/web'
import atom from 'solid-use/atom'
import { Object3D } from 'three'
import { loadAssets } from '@/global/assets.ts'
import { getThumbnailRenderer } from '@/lib/thumbnailRenderer.ts'
import { Editor } from './Editor.tsx'
import './index.css'

const root = document.getElementById('root')

render(() => {
	const thumbnailRenderer = getThumbnailRenderer(128, 1.3)
	const entities: Record<string, Record<string, Object3D>> = createMutable({})
	const loaded = atom(false)
	const assets = atom<Awaited<ReturnType<typeof loadAssets>> | null>(null)
	onMount(async () => {
		assets(await loadAssets(thumbnailRenderer, true))
		for (const key in assets()) {
			const category = assets()?.[key as keyof typeof assets]
			const cat = category as unknown as Record<string, any>
			for (const asset in cat) {
				const obj = cat[asset] as unknown as any
				if (typeof obj == 'object' && 'scene' in obj) {
					entities[key] ??= {}
					entities[key][asset] = obj.scene
				}
				if (obj instanceof Object3D) {
					entities[key] ??= {}
					entities[key][asset] ??= obj
				}
			}
		}
		loaded(true)
	})

	return (
		<Show when={loaded() && assets()}>
			{assets => <Editor entities={entities} thumbnailRenderer={thumbnailRenderer} assets={assets()} />}
		</Show>
	)
}, root!)
