import type { ambiance, music } from '@assets/assets'
import soundsData from '@assets/soundsData.json'
import { assets, settings } from '@/global/init'
import type { soundAssets } from '@/global/sounds'
import { useLocalStorage } from '@/utils/useLocalStorage'

type sounds = Record<soundAssets, Record<string, { volume: number }>>
const [localSoundData] = useLocalStorage<sounds>('soundsData', soundsData)
export class MusicManager {
	ambience: Howl | null = null
	theme: Howl | null = null
	playTheme(theme: music) {
		if (assets.music[theme].playing()) return
		if (!this.theme) {
			const player = assets.music[theme]

			player.volume(localSoundData.music[theme].volume * settings.musicVolume)
			player.fade(0, localSoundData.music[theme].volume, 20)
			player.play()
			player.on('end', () => {
				this.theme = null
			})
			this.theme = player
		}
	}

	playAmbience(ambience: ambiance) {
		if (assets.ambiance[ambience] === this.ambience) return
		this.ambience?.fade(0.05, 0, 10)
		const player = assets.ambiance[ambience]
		player.play()
		player.volume((localSoundData.music[ambience]?.volume ?? 1) * settings.ambianceVolume)
		player.fade(0, (localSoundData.music[ambience]?.volume ?? 1), 10)
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