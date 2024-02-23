import type { music } from '@assets/assets'
import { Destination, Player, start } from 'tone'
import { assets } from './init'
import { save } from './save'

export const initTone = () => {
	window.addEventListener('pointerdown keydown', start)
	Destination.volume.value = save.settings.volume / 100
	Destination.mute = save.settings.mute
	return () => window.removeEventListener('pointerdown keydown', start)
}
export const playAmbiance = (ambiance: music) => () => {
	const player = new Player(assets.music[ambiance].buffer).toDestination()
	player.start()
	player.loop = true
	player.volume.value = -12
	player.onstop = () => player.dispose()
	return () => player.stop()
}