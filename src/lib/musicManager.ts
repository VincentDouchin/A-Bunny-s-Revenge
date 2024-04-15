import type { music } from '@assets/assets'
import { assets } from '@/global/init'

export class MusicManager {
	ambience: Howl | null = null
	theme: Howl | null = null
	playTheme(theme: music) {
		if (assets.music[theme].playing()) return
		if (!this.theme) {
			const player = assets.music[theme]
			player.volume(0.05)
			player.fade(0, 0.05, 20)
			player.play()
			player.on('end', () => {
				this.theme = null
			})
			this.theme = player
		}
	}

	playAmbience(ambience: music) {
		if (assets.music[ambience].playing()) return
		this.ambience?.fade(0.02, 0, 10)
		const player = assets.music[ambience]
		player.play()
		player.fade(0, 0.02, 10)
		player.loop(true)
		this.ambience = player
	}

	pause = () => {
		this.ambience?.pause()
		this.theme?.pause()
	}

	play = () => {
		this.ambience?.play()
		this.theme?.play()
	}
}