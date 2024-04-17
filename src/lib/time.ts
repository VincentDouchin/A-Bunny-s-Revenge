import { Easing } from '@tweenjs/tween.js'
import { Clock } from 'three'
import { clamp } from 'three/src/math/MathUtils'

export class Time extends Clock {
	delta = 0
	elapsed = 0
	tick() {
		this.delta = this.getDelta() * 1000
		this.elapsed += this.delta
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