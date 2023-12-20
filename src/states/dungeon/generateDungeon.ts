import { getFieldIntances } from '../game/spawnLevel'
import type { Dungeon, Room } from './dungeonTypes'
import { RoomType } from './dungeonTypes'
import { dungeonState } from '@/global/states'
import { assets } from '@/global/init'
import { getRandom } from '@/utils/mapFunctions'
import type { direction } from '@/lib/directions'
import { directions, otherDirection } from '@/lib/directions'

const getRoomType = (index: number, max: number): RoomType => {
	if (index === 0) return RoomType.Entrance
	if (index === 1) return RoomType.Item
	if (index === max - 1) return RoomType.Boss
	return RoomType.Battle
}

export const createDungeon = (roomsAmount: number): Dungeon => {
	const rooms: Room[] = []
	const levels = assets.levels.levels.filter(l => getFieldIntances<'level'>(l).dungeon)
	let lastDirection: direction = 'front'
	for (let i = 0; i < roomsAmount; i++) {
		const type = getRoomType(i, roomsAmount)
		const newDirection = getRandom(directions.filter(d => d !== otherDirection[lastDirection]))
		const room: Room = {
			plan: getRandom(levels),
			enemies: [],
			doors: [{ to: i - 1, direction: otherDirection[lastDirection] }, { to: i + 1, direction: newDirection }],
			type,
		}
		lastDirection = newDirection
		rooms.push(room)
	}
	return { rooms }
}

export const generateDungeon = () => {
	const dungeon = createDungeon(3)
	dungeonState.enable({ dungeon, direction: 'front', roomIndex: 0 })
}