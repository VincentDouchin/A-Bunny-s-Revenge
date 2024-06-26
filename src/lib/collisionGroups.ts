const getCollisionGroups = <G extends string>(...groups: G[]) => {
	return (is: G | undefined, touches: G[]) => {
		let isIndex = (1 << ((is ? groups.indexOf(is) : 0) + 16))
		for (const touch of touches) {
			isIndex = isIndex | (1 << groups.indexOf(touch))
		}
		return isIndex
	}
}

export const collisionGroups = getCollisionGroups('player', 'enemy', 'obstacle', 'floor', 'any')
