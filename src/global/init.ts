import { World as RapierWrold, init } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { loadAssets } from './assets'
import type { Entity } from './entity'
import { loadLevelData } from './levelData'
import { getSave } from './save'
import { CoroutinesManager } from '@/lib/coroutines'
import { InputManager } from '@/lib/inputs'
import { MusicManager } from '@/lib/musicManager'
import { DayTime, Time } from '@/lib/time'
import { TweenGroup } from '@/lib/tweens'
import { UIManager } from '@/lib/uiManager'

await init()
export const world = new RapierWrold({ x: 0, y: -9.81 * 20, z: 0 })
export const assets = await loadAssets()
export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()
export const ui = new UIManager()
export const coroutines = new CoroutinesManager()
export const inputManager = new InputManager()
export const levelsData = await loadLevelData()
export const dayTime = new DayTime(600_000)
export const musicManager = new MusicManager()
export const gameTweens = new TweenGroup()
await getSave()