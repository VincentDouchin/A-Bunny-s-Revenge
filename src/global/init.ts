import { QuestManager } from '@/constants/quests'
import { CoroutinesManager } from '@/lib/coroutines'
import { InputManager } from '@/lib/inputs'
import { MusicManager } from '@/lib/musicManager'
import { Thumbnailer } from '@/lib/thumbnailRenderer'
import { DayTime, Time } from '@/lib/time'
import { tweensManager } from '@/lib/tweens'
import { UIManager } from '@/lib/uiManager'
import { init, World as RapierWorld } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { getRenderer } from '@/rendering/renderer'
import { Scene, WebGPURenderer } from 'three/webgpu'
import { loadAssets } from './assets'
import type { Entity } from './entity'
import { menuInputMap, playerInputMap } from './inputMaps'
import { Settings, useSave, useSettings } from './save'
import { app } from './states'

const hot = import.meta.hot
if (hot && !hot?.data.initialized) {
	await init()
	hot.data.thumbnailRenderer = await Thumbnailer.create()
	hot.data.assets = await loadAssets(hot.data.thumbnailRenderer, false)
	hot.data.settings = await useSettings()
	hot.data.ui = new UIManager(hot.data.settings)
	hot.data.renderer = await getRenderer(hot.data.settings)
}

export const { save, resetSave, addItem, removeItem } = await useSave()

export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()
export const coroutines = new CoroutinesManager()
export const inputManager = new InputManager()

export const dayTime = new DayTime(600_000)
export const musicManager = new MusicManager()
export const tweens = tweensManager(time, ecs)
export const questManager = new QuestManager(app, save)
export const gameInputs = playerInputMap()
export const menuInputs = menuInputMap()
export const scene = new Scene()
export const world = new RapierWorld({ x: 0, y: -9.81 * 20, z: 0 })

export const thumbnailRenderer: Thumbnailer = hot?.data.thumbnailRenderer ?? (await Thumbnailer.create())
export const assets: Awaited<ReturnType<typeof loadAssets>> = hot?.data.assets ?? (await loadAssets(thumbnailRenderer, false))
export const settings: Settings = hot?.data.settings ?? (await useSettings())
export const ui: UIManager = hot?.data.ui ?? new UIManager(settings)
export const renderer: WebGPURenderer = hot?.data.renderer ?? (await getRenderer(settings))

if (import.meta.hot) {
	import.meta.hot.accept() // init.ts handles its own updates
}
