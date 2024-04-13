export class Time {
	current = Date.now()
	delta = 0
	elapsed = 0
	reset() {
		this.current = Date.now()
	}

	tick() {
		const newTime = Date.now()
		this.delta = newTime - this.current
		this.current = newTime
		this.elapsed += this.delta
	}

	get uniform() {
		return { value: this.current }
	}
}
