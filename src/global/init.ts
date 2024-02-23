import { World as RapierWrold, init } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { loadAssets } from './assets'
import type { Entity } from './entity'
import { loadLevelData } from './levelData'
import { UIManager } from '@/lib/uiManager'
import { Time } from '@/lib/time'
import { InputManager } from '@/lib/inputs'
import { CoroutinesManager } from '@/lib/coroutines'

await init()
export const world = new RapierWrold({ x: 0, y: -9.81 * 10, z: 0 })
export const assets = await loadAssets()
export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()
export const ui = new UIManager()
export const coroutines = new CoroutinesManager()
export const inputManager = new InputManager()
export const levelsData = await loadLevelData()