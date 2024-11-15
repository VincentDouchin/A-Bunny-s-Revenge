import type { Direction } from '@/lib/directions'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { weapons } from '@assets/assets'
import type { farmDoors } from './entity'
import { AppBuilder } from '@/lib/app'

export const app = new AppBuilder()
	.addState('debug')
	.addState('default')
	.addState('farm', 'dungeon', 'clearing', 'intro', 'village')
	.addState('cutscene')
	.addState('paused')
	.addState('mainMenu', 'game')
	.addState('menu')
	.addState('introQuest')
	.bindRessource<'farm', FarmRessources>()
	.bindRessource<'village', { door: 'village' }>()
	.bindRessource<'dungeon', DungeonRessources>()
	.build()
export interface FarmRessources {
	door: (typeof farmDoors)[number] | null
}
export interface DungeonRessources {
	dungeon: Room
	direction: Direction | (typeof farmDoors)[number]
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: weapons
}
