import { encounters } from './encounters'
import type { enemy } from '@/constants/enemies'
import { enemyGroups } from '@/constants/enemies'
import type { Level } from '@/debug/LevelEditor'
import { levelsData } from '@/global/init'
import type { direction } from '@/lib/directions'
import { otherDirection } from '@/lib/directions'
import { getRandom, mapValues } from '@/utils/mapFunctions'

// ! ROOMS
type Connections = Partial<Record<direction, number | null>>

export enum RoomType {
	Battle,
	Boss,
	Entrance,
	Item,
	NPC,
}
export interface Room {
	plan: Level
	enemies: enemy[]
	doors: Partial<Record<direction, Room | null>>
	type: RoomType
	encounter: keyof typeof encounters | null
}
interface Position {
	x: number
	y: number
}

interface BlankRoom {
	position: Position
	connections: Connections
	type: RoomType
}

const getRoomSidePosition = ({ position }: BlankRoom, side: direction): Position => {
	const positionOffset: Position = { x: 0, y: 0 }

	if (side === 'north') positionOffset.y = 1
	if (side === 'east') positionOffset.x = 1
	if (side === 'south') positionOffset.y = -1
	if (side === 'west') positionOffset.x = -1

	return {
		x: position.x + positionOffset.x,
		y: position.y + positionOffset.y,
	}
}

const findRoomByPosition = (rooms: BlankRoom[], pos: Position) => {
	for (let i = 0; i < rooms.length; i++) {
		if (rooms[i].position.x === pos.x && rooms[i].position.y === pos.y) {
			return i
		}
	}

	return -1
}
const createSideRoom = (rooms: BlankRoom[], roomId: number, direction: direction, position: Position): BlankRoom => {
	rooms[roomId].connections[direction] = rooms.length

	return {
		position,
		type: RoomType.Battle,
		connections: {
			[otherDirection[direction]]: roomId,
		},
	}
}
// ! PATHS
type RoomDistance = BlankRoom & { distance?: number }
const listElegibleRooms = (rooms: BlankRoom[]) => {
	const roomList = new Array<number>()

	for (let i = 0; i < rooms.length; i++) {
		if (Object.keys(rooms[i].connections).length === 1) {
			roomList.push(i)
		}
	}

	return roomList
}

const floodFill = (roomId: number, rooms: RoomDistance[], distance: number) => {
	const currRoom = rooms[roomId]
	if (currRoom.distance !== undefined) return

	currRoom.distance = distance

	for (const connectionSide of Object.keys(currRoom.connections) as direction[]) {
		const connection = currRoom.connections[connectionSide]
		if (connection) {
			floodFill(connection, rooms, distance + 1)
		}
	}
}
const resetFloodFill = (rooms: RoomDistance[]) => {
	rooms.forEach(room => delete room.distance)
}
const assignStartOrEnd = (room: BlankRoom, rooms: BlankRoom[]) => {
	const possibleStart = (['north', 'east', 'west', 'south'] as const).filter((dir) => {
		const position = getRoomSidePosition(room, dir)
		return !rooms.find(r => r.position.x === position.x && r.position.y === position.y)
	})
	if (possibleStart.length === 0) {
		const newPossibleDirections = (['north', 'south', 'east', 'west'] as const).filter(dir => !(dir in room.connections))
		possibleStart.push(...newPossibleDirections)
	}
	room.connections[getRandom(possibleStart)] = null
}

const findStartExit = (rooms: RoomDistance[]) => {
	const elegibleRooms = listElegibleRooms(rooms)

	let currDistance = 0
	let startRoomId = elegibleRooms[0]
	let endRoomId = elegibleRooms[1]

	for (let i = 0; i < elegibleRooms.length - 1; i++) {
		floodFill(elegibleRooms[i], rooms, 0)
		for (let j = i + 1; j < elegibleRooms.length; j++) {
			const endRoom = rooms[elegibleRooms[j]]
			if (endRoom.distance! > currDistance) {
				currDistance = endRoom.distance!
				startRoomId = elegibleRooms[i]
				endRoomId = elegibleRooms[j]
			}
		}

		resetFloodFill(rooms)
	}
	const startRoom = rooms[startRoomId]
	startRoom.type = RoomType.Entrance
	const endRoom = rooms[endRoomId]
	endRoom.type = RoomType.Boss

	assignStartOrEnd(startRoom, rooms)
	assignStartOrEnd(endRoom, rooms)
}
const findCriticalPath = (rooms: RoomDistance[]) => {
	let maxInterations = rooms.length
	const startRoomId = rooms.findIndex(room => room.type === RoomType.Entrance)
	let currRoomId = rooms.findIndex(room => room.type === RoomType.Boss)
	const criticalRooms: RoomDistance[] = []
	floodFill(startRoomId, rooms, 0)

	while (maxInterations-- >= 0) {
		criticalRooms.push(rooms[currRoomId])
		if (currRoomId === startRoomId) break

		const currRoom = rooms[currRoomId]
		for (const connectionSide in currRoom.connections) {
			const roomId = currRoom.connections[connectionSide as direction]
			if (roomId && rooms[roomId].distance! === currRoom.distance! - 1) {
				currRoomId = roomId
				break
			}
		}
	}
	return criticalRooms
}

const createRooms = (count: number): BlankRoom[] => {
	const rooms: BlankRoom[] = [{
		position: { x: 0, y: 0 },
		connections: {},
		type: RoomType.Battle,
	}]

	while (count > 1) {
		const rndRoomId = Math.floor(Math.random() * rooms.length)
		const rndSide: direction = getRandom(['north', 'south', 'east', 'west'])
		const rndRoom = rooms[rndRoomId]
		const position = getRoomSidePosition(rndRoom, rndSide)

		if (findRoomByPosition(rooms, position) === -1) {
			const newRoom = createSideRoom(rooms, rndRoomId, rndSide, position)
			rooms.push(newRoom)
			count--
		}
	}

	return rooms
}

const getEnemies = (type: RoomType): enemy[] => {
	switch (type) {
		case RoomType.Battle:
		case RoomType.Entrance: return getRandom(enemyGroups.filter(group => !group.boss)).enemies
		case RoomType.Item: return []
		case RoomType.Boss: {
			const possibleGroups = enemyGroups.filter(group => group.boss !== undefined)
			const group = getRandom(possibleGroups)
			return [group.boss, ...group.enemies].filter(Boolean)
		}
		default:return []
	}
}

export const assignPlanAndEnemies = (rooms: BlankRoom[]): Room[] => {
	const dungeons = levelsData.levels.filter(level => level.dungeon)
	const filledRooms = rooms.map((room) => {
		const directions = Object.keys(room.connections) as direction[]
		const possibleRooms = dungeons.filter((dungeon) => {
			const props = Object.values(levelsData.levelData).filter(p => p?.map === dungeon.id && p?.data?.direction)
			return directions.length === props.length && directions.every(dir => props.some((p) => {
				return p?.data?.direction === dir
			}))
		})
		const enemies = [...getEnemies(room.type)]
		const doors = {}
		const plan = getRandom(possibleRooms)
		if (!plan) throw new Error(`no plan found for connections : ${directions.join(', ')}`)
		let encounter: null | keyof typeof encounters = null
		if (room.type === RoomType.NPC) {
			encounter = getRandom(Object.keys(encounters) as (keyof typeof encounters)[])
		}
		return { ...room, plan, enemies, doors, encounter }
	})
	for (let i = 0; i < filledRooms.length; i++) {
		filledRooms[i].doors = mapValues(rooms[i].connections, index => typeof index === 'number' ? filledRooms[index] : null)
	}
	return filledRooms
}

const placeNPC = (rooms: BlankRoom[]) => {
	const criticalPath = findCriticalPath(rooms)
	const possibleRooms = rooms.filter(r => !criticalPath.includes(r) && ![RoomType.Entrance, RoomType.Boss].includes(r.type))
	if (possibleRooms.length) {
		const npcRoom = getRandom(possibleRooms)
		npcRoom.type = RoomType.NPC
	}
}

export const genDungeon = (roomsAmount: number, npc: boolean) => {
	const rooms = createRooms(roomsAmount)
	findStartExit(rooms)
	if (npc) {
		placeNPC(rooms)
	}
	const filledRooms = assignPlanAndEnemies(rooms)
	return filledRooms
}
