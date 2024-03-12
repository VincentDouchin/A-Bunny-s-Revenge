import { StateMananger } from './../lib/state'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { direction } from '@/lib/directions'

export const app = new StateMananger()
export const coreState = app.create()
export const gameState = app.create()
export interface FarmRessources {
	previousState?: 'dungeon'
}
export const campState = app.create<FarmRessources>()
export const setupState = app.create()
export const openMenuState = app.create()
export const cutSceneState = app.create()
export const genDungeonState = app.create()
export const pausedState = app.create()
export interface DungeonRessources {
	dungeon: Room
	direction: direction
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
}

export const dungeonState = app.create<DungeonRessources>()
app.exclusive(setupState, campState, dungeonState, genDungeonState)
