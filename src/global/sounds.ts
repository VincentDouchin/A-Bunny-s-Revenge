import { Destination, start } from 'tone'
import { save } from './save'

export const initTone = () => {
	window.addEventListener('pointerdown keydown', start)
	Destination.volume.value = save.settings.volume / 100
	Destination.mute = save.settings.mute
	return () => window.removeEventListener('pointerdown keydown', start)
}