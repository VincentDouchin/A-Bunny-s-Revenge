const getCollisionGroups = <G extends string>(...groups: G[]) => {
	return (is: G | undefined, touches: G[]) => {
		let isIndex = (1 << ((is ? groups.indexOf(is) : 0) + 16))
		for (const touch of touches) {
			isIndex = isIndex | (1 << groups.indexOf(touch))
		}
		return isIndex
	}
}
const getSolverGroups = <G extends string>(...groups: G[]) => {
	return (is: G | undefined, interactsWith: G[]) => {
		let mask = 0
		for (const group of interactsWith) {
			mask |= 1 << groups.indexOf(group)
		}
		// Format: (membership << 16) | interacts_with
		return ((1 << groups.indexOf(is || groups[0])) << 16) | mask
	}
}

const groups = ['player', 'enemy', 'obstacle', 'floor', 'any'] as const

export const collisionGroups = getCollisionGroups(...groups)
export const solverGroups = getSolverGroups(...groups)