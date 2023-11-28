export class Time {
	current = Date.now()
	delta = 0
	elapsed = 0
	tick() {
		const newTime = Date.now()
		this.delta = newTime - this.current
		this.current = newTime
		this.elapsed += this.delta
	}
}

export class Timer {
	elapsed = 0
	#lastTick = 0
	#tick = 0
	constructor(public delay: number) {

	}

	get percentFinished() {
		return this.elapsed / this.delay
	}

	tick(delta: number) {
		this.elapsed += delta
		this.#lastTick = this.#tick
		this.#tick = Math.floor(this.elapsed / this.delay)
	}

	get justFinished() {
		return this.#tick !== this.#lastTick
	}

	get finished() {
		return this.#tick > 0
	}
}
