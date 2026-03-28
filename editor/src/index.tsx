import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import 'vfonts/FiraCode.css'

const root = document.getElementById('root')!
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount(root)
// render(() => {
// 	const thumbnailRenderer = atom<Thumbnailer | null>(null)
// 	const entities: Record<string, Record<string, Object3D>> = createMutable({})
// 	const loaded = atom(false)
// 	const assets = atom<Awaited<ReturnType<typeof loadAssets>> | null>(null)
// 	onMount(async () => {
// 		thumbnailRenderer(await Thumbnailer.create(128))
// 		assets(await loadAssets(thumbnailRenderer()!, true))
// 		for (const key in assets()) {
// 			const category = assets()?.[key as keyof typeof assets]
// 			const cat = category as unknown as Record<string, any>
// 			for (const asset in cat) {
// 				const obj = cat[asset] as unknown as any
// 				if (typeof obj == 'object' && 'scene' in obj) {
// 					entities[key] ??= {}
// 					entities[key][asset] = obj.scene
// 				}
// 				if (obj instanceof Object3D) {
// 					entities[key] ??= {}
// 					entities[key][asset] ??= obj
// 				}
// 			}
// 		}
// 		loaded(true)
// 	})

// 	return (
// 		<Show when={loaded() && assets()}>
// 			{assets => <Editor entities={entities} thumbnailRenderer={thumbnailRenderer()!} assets={assets()} />}
// 		</Show>
// 	)
// }, root!)
