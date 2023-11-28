import { StateMananger } from './../lib/state'
import type { direction } from '@/lib/directions'

export const app = new StateMananger()
export const coreState = app.create()
export const gameState = app.create()
export const campState = app.create()

export interface DungeonRessources {
	door: number
	direction: direction
}

export const dungeonState = app.create<DungeonRessources>()
app.exclusive(campState, dungeonState)
