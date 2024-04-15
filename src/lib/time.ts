import { Easing } from '@tweenjs/tween.js'
import { clamp } from 'three/src/math/MathUtils'

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

export class DayTime {
	current = 0
	dayToNight = true
	constructor(public dayLength: number) {

	}

	tick(delta: number) {
		this.current += (delta / this.dayLength * (this.dayToNight ? 1 : -1))
		this.current = clamp(this.current, 0, 1)
		if (this.current >= 1 || this.current <= 0) {
			this.dayToNight = !this.dayToNight
		}
	}

	intensity() {
		return clamp(Easing.Quadratic.InOut(this.current), 0, 1)
	}
}