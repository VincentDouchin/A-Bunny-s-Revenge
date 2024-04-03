import { Easing, Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'

const nightLightQuery = ecs.with('nightLight')
const emissiveMatQuery = ecs.with('emissiveMat')
const ambientLightQuery = ecs.with('light', 'ambientLight')
export const initTimeOfDay = () => {
	const timeOfDay: With<Entity, 'timeOfDay'> = {
		timeOfDay: 0,
		tween: new Tween({ intensity: 0 }).to({ intensity: 1 }, 60_000 * 10).yoyo(true).repeat(Number.POSITIVE_INFINITY).onUpdate(value => timeOfDay.timeOfDay = value.intensity).easing(Easing.Quadratic.InOut),
	}
	ecs.add(timeOfDay)
}
export const timeOfDayQuery = ecs.with('timeOfDay')
export const dayNight = () => {
	for (const { timeOfDay } of timeOfDayQuery) {
		for (const entity of nightLightQuery) {
			entity.nightLight.intensity = timeOfDay
		}
		for (const entity of emissiveMatQuery) {
			entity.emissiveMat.emissiveIntensity = timeOfDay / 2
		}
		for (const entity of ambientLightQuery) {
			if (entity.ambientLight === 'night') {
				entity.light.intensity = timeOfDay * 2
			}
			if (entity.ambientLight === 'day') {
				entity.light.intensity = (1 - timeOfDay) * 2
			}
		}
	}
}