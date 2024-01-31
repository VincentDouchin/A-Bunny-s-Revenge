import type { Level } from '@/LDTKMap'
import type { enemy } from '@/constants/enemies'
import type { direction } from '@/lib/directions'

export enum RoomType {
	Battle,
	Boss,
	Entrance,
	Item,
}
export interface Room {
	plan: Level
	enemies: enemy[]
	doors: Partial<Record<direction, Room | null>>
	type: RoomType
}
