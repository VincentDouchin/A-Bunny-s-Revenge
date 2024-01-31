import { getFieldIntances } from '../game/spawnLevel'
import type { Room } from './dungeonTypes'
import { RoomType } from './dungeonTypes'
import type { Level } from '@/LDTKMap'
import type { enemy } from '@/constants/enemies'
import { enemyGroups } from '@/constants/enemies'
import { assets, levelsData } from '@/global/init'
import { dungeonState } from '@/global/states'
import type { direction } from '@/lib/directions'
import { otherDirection } from '@/lib/directions'
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
const getProps = (level: Level) => Object.values(levelsData.levelData).filter(prop => prop?.map === level.iid).filter(Boolean)
const getConnectingLevels = (levels: Level[], direction: direction) => {
	return levels.filter(level => getProps(level).some(prop => prop.data?.direction === direction))
}
const getOtherDirections = (level: Level, direction: direction): direction[] => getProps(level).filter(prop => prop.data?.direction && prop.data.direction !== direction).map(prop => prop.data.direction)

export const createDungeon = (roomsAmount: number): Room => {
	const dungeons = assets.levels.levels.filter((level) => {
		const fields = getFieldIntances<'level'>(level)
		return fields.dungeon
	})
	let roomsCreated = 0
	const createRoom = (enteringFrom: direction, last: null | Room = null): Room => {
		const type = getRoomType(roomsCreated, roomsAmount)
		roomsCreated++
		const level = getRandom(getConnectingLevels(dungeons, enteringFrom))
		const doorsDirections = getOtherDirections(level, enteringFrom)
		const enemies = getEnemies(type)
		const doors: Room['doors'] = { [enteringFrom]: last }
		const room = { plan: level, type, doors, enemies }
		for (let i = 0; i < 1; i++) {
			const doorDirection = doorsDirections[i]
			if (roomsCreated >= roomsAmount) {
				doors[doorDirection] = null
			} else {
				doors[doorDirection] = createRoom(otherDirection[doorDirection], room)
			}
		}

		return room
	}
	return createRoom('south')
}

export const generateDungeon = () => {
	const dungeon = createDungeon(3)
	dungeonState.enable({ dungeon, direction: 'south' })
}