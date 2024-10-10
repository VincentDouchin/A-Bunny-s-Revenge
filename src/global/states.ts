import type { weapons } from '@assets/assets'
import { StateMananger } from './../lib/state'
import type { farmDoors } from './entity'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Direction } from '@/lib/directions'

export const app = new StateMananger()
export const coreState = app.create()
export const gameState = app.create()
export interface FarmRessources {
	door: (typeof farmDoors)[number]
}
export const campState = app.create<FarmRessources>()
export const setupState = app.create()
export const openMenuState = app.create()
export const cutSceneState = app.create()
export const genDungeonState = app.create()
export const pausedState = app.create()
export const mainMenuState = app.create()
export const introState = app.create()
export interface DungeonRessources {
	dungeon: Room
	direction: Direction | (typeof farmDoors)[number]
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: weapons
}

export const dungeonState = app.create<DungeonRessources>()
export const introQuest = app.create()
app.exclusive(setupState, campState, dungeonState, genDungeonState, introState)
