export const runif = (...systems: Array<() => unknown>) => (condition: () => boolean) => () => {
	if (condition()) {
		for (const system of systems) {
			system()
		}
	}
}
export const throttle = (...systems: Array<() => unknown>) => (delay: number) => {
	let time = Date.now()
	return () => {
		if (Date.now() - time >= delay) {
			for (const system of systems) {
				system()
			}
			time = Date.now()
		}
	}
}
