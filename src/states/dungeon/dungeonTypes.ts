import type { Vec2 } from 'three'
import type { Level } from '@/LDTKMap'
import type { Entity } from '@/global/entity'

export interface Enemy {
	name: characters
	position: Vec2
	currentHealth: number
	maxHealth: number
}
export enum RoomType {
	Battle,
	Boss,
	Entrance,
	Item,
}
export interface Room {
	plan: Level
	enemies: Enemy[]
	doors: Entity['door'][]
	type: RoomType
}
export interface Dungeon {
	rooms: Room[]
}
