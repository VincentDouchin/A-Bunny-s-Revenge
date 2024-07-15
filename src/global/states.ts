import type { weapons } from '@assets/assets'
import { StateMananger } from './../lib/state'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Direction } from '@/lib/directions'

export const app = new StateMananger()
export const coreState = app.create()
export const gameState = app.create()
export interface FarmRessources {
	previousState?: 'dungeon' | 'ruins'
}
export const campState = app.create<FarmRessources>()
export const setupState = app.create()
export const openMenuState = app.create()
export const cutSceneState = app.create()
export const genDungeonState = app.create()
export const pausedState = app.create()
export const mainMenuState = app.create()
export const ruinsIntro = app.create()
export interface DungeonRessources {
	dungeon: Room
	direction: Direction
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: weapons
}

export const dungeonState = app.create<DungeonRessources>()
app.exclusive(setupState, campState, dungeonState, genDungeonState, ruinsIntro)
