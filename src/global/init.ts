import type { Entity } from './entity'
import { QuestManager } from '@/constants/quests'
import { CoroutinesManager } from '@/lib/coroutines'
import { InputManager } from '@/lib/inputs'
import { MusicManager } from '@/lib/musicManager'
import { DayTime, Time } from '@/lib/time'
import { tweensManager } from '@/lib/tweens'
import { UIManager } from '@/lib/uiManager'
import { init, World as RapierWorld } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { loadAssets } from './assets'
import { loadLevelData } from './levelData'
import { useSave, useSettings } from './save'
import { app } from './states'

await init()
// await getSave()
export const settings = await useSettings()
export const { save, resetSave, addItem, removeItem } = await useSave()
export const world = new RapierWorld({ x: 0, y: -9.81 * 20, z: 0 })
export const assets = await loadAssets()
export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()
export const ui = new UIManager(settings)
export const coroutines = new CoroutinesManager()
export const inputManager = new InputManager()
export const levelsData = await loadLevelData()
export const dayTime = new DayTime(600_000)
export const musicManager = new MusicManager()
export const tweens = tweensManager(time, ecs)
export const questManager = new QuestManager(app)