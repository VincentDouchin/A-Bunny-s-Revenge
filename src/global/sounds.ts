import type { soundEffects } from '@assets/assets'
import { Destination, PitchShift, Player, start } from 'tone'
import { assets } from './init'
import { save } from './save'
import { getRandom, memo } from '@/utils/mapFunctions'
import { Pool } from '@/lib/pool'

export const initTone = () => {
	window.addEventListener('pointerdown keydown', start)
	Destination.volume.value = save.settings.volume / 100
	Destination.mute = save.settings.mute
	return () => window.removeEventListener('pointerdown keydown', start)
}
const pitch = memo((pitch: number) => new PitchShift({ pitch, windowSize: 1 }))
const soundPool = new Pool<Player>(player => new Player(player.buffer), 10)

type soundAssets = { [k in keyof typeof assets]: (typeof assets)[k] extends Record<string, Player> ? k : never }[keyof typeof assets]

export const playSFX = <K extends string = string>(soundAsset: soundAssets) => (sound: K | K[] | 'random', options?: { volume?: number, pitch?: number, playbackRate?: number, offset?: number }) => {
	return new Promise<void>((resolve) => {
		const selectedSound = sound === 'random'
			? getRandom(Object.keys(assets[soundAsset]))
			: Array.isArray(sound)
				? getRandom(sound)
				: sound
		const [player, free] = soundPool.get(assets[soundAsset][selectedSound])
		const soundPlayer = player.toDestination()
		if (options?.playbackRate) {
			soundPlayer.playbackRate = options.playbackRate
		}
		if (options?.volume) {
			soundPlayer.volume.value = options.volume
		}
		if (options?.pitch) {
			soundPlayer.connect(pitch(options.pitch).toDestination())
		}

		soundPlayer.start()
		soundPlayer.onstop = () => {
			free()
			soundPlayer.playbackRate = 1
		}
		setTimeout(() => {
			resolve()
		}, Math.max(soundPlayer.buffer.duration * 1000 / (options?.playbackRate ?? 1) + (options?.offset ?? 0), 1))
	})
}
export const playSound = playSFX<soundEffects>('soundEffects')
export const playVoice = playSFX('voices')
export const playStep = playSFX('steps')

export const playAmbiance = (ambiance: soundEffects) => () => {
	const player = new Player(assets.soundEffects[ambiance].buffer).toDestination()
	player.start()
	player.loop = true
	player.volume.value = -12
	player.onstop = () => player.dispose()
	return () => player.stop()
}