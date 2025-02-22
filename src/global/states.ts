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
	.bindResource<'farm', FarmResources>()
	.bindResource<'village', { door: 'village' }>()
	.bindResource<'dungeon', DungeonResources>()
	.build()
export interface FarmResources {
	door: (typeof farmDoors)[number] | null
}
export interface DungeonResources {
	dungeon: Room
	direction: Direction | (typeof farmDoors)[number]
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: weapons
}
