import { StateMananger } from './../lib/state'
import type { Dungeon } from '@/states/dungeon/dungeonTypes'
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

export const genDungeonState = app.create()

export interface DungeonRessources {
	dungeon: Dungeon
	direction: direction
	roomIndex: number
}

export const dungeonState = app.create<DungeonRessources>()
app.exclusive(setupState, campState, dungeonState, genDungeonState)
