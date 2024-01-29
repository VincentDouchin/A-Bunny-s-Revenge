import type { Level } from '@/LDTKMap'
import type { enemy } from '@/constants/enemies'
import type { Entity } from '@/global/entity'

export enum RoomType {
	Battle,
	Boss,
	Entrance,
	Item,
}
export interface Room {
	plan: Level
	enemies: enemy[]
	doors: NonNullable<Entity['door']>[]
	type: RoomType
}
export interface Dungeon {
	rooms: Room[]
}
