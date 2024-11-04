import type { Direction } from '@/lib/directions'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { weapons } from '@assets/assets'
import type { farmDoors } from './entity'
import { AppBuilder } from '@/lib/app'

export const app = new AppBuilder()
	.addState('debug')
	.addState('default')
	.addState('farm', 'setup', 'dungeon', 'clearing', 'intro', 'village')
	.addState('cutscene')
	.addState('paused')
	.addState('mainMenu')
	.addState('menu')
	.addState('game')
	.bindRessource<'farm', FarmRessources>()
	.bindRessource<'village', { door: 'village' }>()
	.bindRessource<'dungeon', DungeonRessources>()
	.setInitialState('default')
	.setInitialState('setup')
	.setInitialState('game')
	.build()

// export const app = new StateMananger()
// export const coreState = app.create()
// export const gameState = app.create()
export interface FarmRessources {
	door: (typeof farmDoors)[number] | null
}
// export const campState = app.create<FarmRessources>()
// export const setupState = app.create()
// export const openMenuState = app.create()
// export const cutSceneState = app.create()
// export const genDungeonState = app.create()
// export const pausedState = app.create()
// export const mainMenuState = app.create()
// export const introState = app.create()
// export const villageState = app.create<{ door: 'village' }>()
export interface DungeonRessources {
	dungeon: Room
	direction: Direction | (typeof farmDoors)[number]
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: weapons
}

// export const dungeonState = app.create<DungeonRessources>()
// export const introQuest = app.create()
// app.exclusive(setupState, campState, dungeonState, genDungeonState, introState, villageState)
