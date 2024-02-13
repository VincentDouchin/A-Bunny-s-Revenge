import { World as RapierWrold, init } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { loadAssets, loadLevelData } from './assets'
import type { Entity } from './entity'
import { loadImage } from './assetLoaders'
import { Time } from '@/lib/time'
import { UIManager } from '@/lib/uiManager'
import { CoroutinesManager } from '@/lib/coroutines'
import { InputManager } from '@/lib/inputs'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'
import { entries } from '@/utils/mapFunctions'

await init()
export const world = new RapierWrold({ x: 0, y: -9.81 * 10, z: 0 })
export const assets = await loadAssets()
export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()
export const ui = new UIManager()
export const coroutines = new CoroutinesManager()
export const inputManager = new InputManager()
export const levelsData = await loadLevelData()
export const thumbnail = thumbnailRenderer()
for (const [key, val] of entries(assets.models)) {
	if (key in assets.items) {
		const canvas = thumbnail.getCanvas(val.scene)
		// @ts-expect-error hack
		assets.items[key] = await loadImage(canvas.toDataURL())
	}
}