import { easeInOut } from 'popmotion'
import { Clock } from 'three'
import { clamp } from 'three/src/math/MathUtils'
import { save } from '@/global/init'

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
	timePassed = 0
	dayLight = 0
	constructor(public dayLength: number) {
		this.current = save.daytime.current
		this.dayToNight = save.daytime.dayToNight
		this.timePassed = save.daytime.timePassed
		this.dayLight = save.daytime.dayLight
	}

	saveTime = () => {
		save.daytime = {
			current: this.current,
			dayToNight: this.dayToNight,
			timePassed: this.timePassed,
			dayLight: this.dayLight,
		}
	}

	tick(delta: number) {
		this.current += (delta / this.dayLength * (this.dayToNight ? 1 : -1))
		this.current = clamp(this.current, 0, 1)
		this.timePassed += delta
		if (this.current < 0.5) this.dayLight += delta
		if (this.current >= 1 || this.current <= 0) {
			this.dayToNight = !this.dayToNight
		}

		this.saveTime()
	}

	intensity() {
		return clamp(easeInOut(this.current * this.current), 0, 1)
	}
}