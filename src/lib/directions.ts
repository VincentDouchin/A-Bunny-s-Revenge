export enum Direction {
	N = 'north',
	S = 'south',
	E = 'east',
	W = 'west',
}
export const cardinalDirections: Direction[] = [Direction.N, Direction.S, Direction.W, Direction.E]

export const isCardinalDirection = (direction: string): direction is Direction => cardinalDirections.includes(direction)

export const otherDirection: Record<Direction, Direction> = {
	[Direction.N]: Direction.S,
	[Direction.S]: Direction.N,
	[Direction.W]: Direction.E,
	[Direction.E]: Direction.W,
}