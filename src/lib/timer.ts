export class Timer<F extends boolean> {
	current: number
	duration: number
	enabled = true
	constructor(duration: number, start: F) {
		this.duration = duration
		this.current = start ? duration : 0
	}

	reset() {
		this.current = 0
		this.enabled = true
	}

	tick(delta: number) {
		if (this.enabled) {
			this.current = Math.max(0, Math.min(this.duration, this.current + delta))
		}
	}

	percent() {
		return this.current / this.duration
	}

	finished() {
		return this.current === this.duration && this.enabled
	}

	running() {
		return this.current < this.duration && this.current !== 0
	}
}
