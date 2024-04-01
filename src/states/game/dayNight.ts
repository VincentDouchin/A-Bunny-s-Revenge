import { Easing, Tween } from '@tweenjs/tween.js'
import { ecs, time } from '@/global/init'

const nightLightQuery = ecs.with('nightLight')
const emissiveMatQuery = ecs.with('emissiveMat')
const ambientLightQuery = ecs.with('light', 'ambientLight')
let intensity = 0
const tween = new Tween({ intensity: 0 }).to({ intensity: 1 }, 6_000 * 10).yoyo(true).repeat(Number.POSITIVE_INFINITY).start(time.elapsed).onUpdate(value => intensity = value.intensity).easing(Easing.Quadratic.InOut)

export const dayNight = () => {
	tween.update(time.elapsed)
	const overlay = document.querySelector('.overlay')
	if (overlay instanceof HTMLElement) {
		overlay.style.setProperty('--opacity', String((1 - intensity) / 2))
	}
	for (const entity of nightLightQuery) {
		entity.nightLight.intensity = intensity
	}
	for (const entity of emissiveMatQuery) {
		entity.emissiveMat.emissiveIntensity = intensity / 2
	}
	for (const entity of ambientLightQuery) {
		if (entity.ambientLight === 'night') {
			entity.light.intensity = intensity * 2
		}
		if (entity.ambientLight === 'day') {
			entity.light.intensity = (1 - intensity) * 2
		}
	}
}