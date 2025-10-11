import type { AssetNames } from '@/global/entity'
import { assets, settings } from '@/global/init'
import { localSoundData } from '@/global/sounds'

export class MusicManager {
	ambience: Howl | null = null
	theme: Howl | null = null
	playTheme(theme: AssetNames['music']) {
		if (assets.music[theme].playing()) return
		if (!this.theme) {
			const player = assets.music[theme]

			player.volume((localSoundData.music?.[theme]?.volume ?? 1) * settings.musicVolume)
			player.fade(0, (localSoundData.music?.[theme]?.volume ?? 1), 20)
			player.play()
			player.on('end', () => {
				this.theme = null
			})
			this.theme = player
		}
	}

	playAmbience(ambience: AssetNames['ambiance']) {
		if (assets.ambiance[ambience] === this.ambience) return
		this.ambience?.fade(0.05, 0, 10)
		const player = assets.ambiance[ambience]
		player.play()
		player.volume((localSoundData.ambiance?.[ambience]?.volume ?? 1) * settings.ambianceVolume)
		player.fade(0, (localSoundData.ambiance?.[ambience]?.volume ?? 1), 10)
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