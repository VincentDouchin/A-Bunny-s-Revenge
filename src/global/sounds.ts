import type { music } from '@assets/assets'
import { Destination, Player, start } from 'tone'
import { assets } from './init'
import { save } from './save'
import { getRandom } from '@/utils/mapFunctions'

export const initTone = () => {
	window.addEventListener('pointerdown keydown', start)
	Destination.volume.value = save.settings.volume / 100
	Destination.mute = save.settings.mute
	return () => window.removeEventListener('pointerdown keydown', start)
}
export const playSound = (sound: music | music[], options?: { volume?: number }) => {
	const selectedSound = Array.isArray(sound) ? getRandom(sound) : sound
	const soundPlayer = new Player(assets.music[selectedSound].buffer).toDestination()
	if (options?.volume) {
		soundPlayer.volume.value = options.volume
	}
	soundPlayer.start()
	soundPlayer.onstop = () => {
		soundPlayer.dispose()
	}
}

export const playAmbiance = (ambiance: music) => () => {
	const player = new Player(assets.music[ambiance].buffer).toDestination()
	player.start()
	player.loop = true
	player.volume.value = -12
	player.onstop = () => player.dispose()
	return () => player.stop()
}