export const directions = ['front', 'back', 'left', 'right'] as const
export const directionsXY = ['up', 'down', 'left', 'right'] as const

export type direction = typeof directions[number]

export const otherDirection: Record<direction, direction> = {
	front: 'back',
	back: 'front',
	left: 'right',
	right: 'left',
}