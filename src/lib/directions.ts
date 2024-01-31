export const cardinalDirections = ['north', 'south', 'west', 'east'] as const

export type direction = typeof cardinalDirections[number]

export const otherDirection: Record<direction, direction> = {
	north: 'south',
	south: 'north',
	west: 'east',
	east: 'west',
}