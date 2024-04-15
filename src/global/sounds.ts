import type { soundEffects } from '@assets/assets'
import { assets } from './init'
import { save } from './save'
import { getRandom } from '@/utils/mapFunctions'

export const initHowler = () => {
	Howler.volume(save.settings.volume / 100)
	Howler.mute(save.settings.mute)
}

type soundAssets = { [k in keyof typeof assets]: (typeof assets)[k] extends Record<string, Howl> ? k : never }[keyof typeof assets]

export const playSFX = <K extends string = string>(soundAsset: soundAssets) => (sound: K | K[] | 'random', options?: { volume?: number, playbackRate?: number, offset?: number }) => {
	const selectedSound = sound === 'random'
		? getRandom(Object.keys(assets[soundAsset]))
		: Array.isArray(sound)
			? getRandom(sound)
			: sound
	const soundPlayer = assets[soundAsset][selectedSound]

	if (options?.volume) {
		soundPlayer.volume(options.volume)
	}
	if (options?.playbackRate) {
		soundPlayer.rate(options.playbackRate)
	}
	soundPlayer.play()
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve()
		}, Math.max(soundPlayer.duration() * 1000 / (options?.playbackRate ?? 1) + (options?.offset ?? 0), 1))
	})
}
export const playSound = playSFX<soundEffects>('soundEffects')
export const playVoice = playSFX('voices')
export const playStep = playSFX('steps')
