export class Timer<F extends boolean> {
	current: number
	duration: number
	constructor(duration: number, start: F) {
		this.duration = duration
		this.current = start ? duration : 0
	}

	reset() {
		this.current = 0
	}

	tick(delta: number) {
		this.current = Math.min(this.duration, this.current + delta)
	}

	finished() {
		return this.current === this.duration
	}

	running() {
		return this.current < this.duration
	}
}
