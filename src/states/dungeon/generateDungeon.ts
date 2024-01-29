import { getFieldIntances } from '../game/spawnLevel'
import type { Dungeon, Room } from './dungeonTypes'
import { RoomType } from './dungeonTypes'
import type { enemy } from '@/constants/enemies'
import { enemyGroups } from '@/constants/enemies'
import { assets } from '@/global/init'
import { dungeonState } from '@/global/states'
import type { direction } from '@/lib/directions'
import { directions, otherDirection } from '@/lib/directions'
import { getRandom } from '@/utils/mapFunctions'

const getRoomType = (index: number, max: number): RoomType => {
	if (index === 0) return RoomType.Entrance
	// if (index === 1) return RoomType.Item
	if (index === max - 1) return RoomType.Boss
	return RoomType.Battle
}
const getEnemies = (type: RoomType): enemy[] => {
	switch (type) {
		case RoomType.Battle:
		case RoomType.Entrance: return getRandom(enemyGroups.filter(group => !group.boss)).enemies
		case RoomType.Item:return []
		case RoomType.Boss:{
			const possibleGroups = enemyGroups.filter(group => group.boss !== undefined)
			const group = getRandom(possibleGroups)
			return [group.boss, ...group.enemies].filter(Boolean)
		}
	}
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
			enemies: getEnemies(type),
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