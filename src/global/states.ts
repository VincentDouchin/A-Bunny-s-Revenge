import type { AssetNames } from './entity'
import type { Direction } from '@/lib/directions'
import type { Room } from '@/states/dungeon/generateDungeon'
import { AppBuilder } from '@/lib/app'

export const app = new AppBuilder()
	.addState('debug')
	.addState('default')
	.addState('farm', 'dungeon', 'clearing', 'village')
	.addState('cutscene')
	.addState('paused')
	.addState('mainMenu', 'game')
	.addState('menu')
	.addState('testDialog')
	.addState('test')
	.bindResource<'farm', FarmResources>()
	.bindResource<'village', { door: 'village' }>()
	.bindResource<'dungeon', DungeonResources>()
	.build()
export interface FarmResources {
	direction: 'doorFarm' | null
}
export interface DungeonResources {
	direction: Direction
	dungeon: Room
	playerHealth: number
	firstEntry: boolean
	dungeonLevel: number
	weapon: AssetNames['weapons']
}
