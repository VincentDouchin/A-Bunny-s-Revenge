import { dayTime, ecs, musicManager, time } from '@/global/init'

const nightLightQuery = ecs.with('nightLight')
const emissiveMatQuery = ecs.with('emissiveMat')
const ambientLightQuery = ecs.with('light', 'ambientLight')
export const dayNight = () => {
	dayTime.tick(time.delta)
	for (const entity of nightLightQuery) {
		entity.nightLight.intensity = dayTime.intensity()
	}
	for (const entity of emissiveMatQuery) {
		entity.emissiveMat.emissiveIntensity = dayTime.intensity() / 2
	}
	for (const entity of ambientLightQuery) {
		if (entity.ambientLight === 'night') {
			entity.light.intensity = dayTime.intensity() * 2
		}
		if (entity.ambientLight === 'day') {
			entity.light.intensity = (1 - dayTime.intensity()) * 2
		}
	}
}
export const playNightMusic = () => {
	if (dayTime.current >= 0.8 && dayTime.dayToNight === true) {
		musicManager.playTheme('garden_night')
	}
}
