import type { soundEffects } from '@assets/assets'
import soundsData from '@assets/soundsData.json'
import { assets } from './init'
import { save } from './save'
import { getRandom } from '@/utils/mapFunctions'
import { useLocalStorage } from '@/utils/useLocalStorage'

const setMuted = (sounds: soundAssets | 'global', muted: boolean) => {
	if (sounds === 'global') {
		Howler.mute(muted)
	} else {
		for (const sound in assets[sounds]) {
			assets[sounds][sound].mute(muted)
		}
	}
}
export const setAllMuted = () => {
	setMuted('global', save.settings.mute)
	setMuted('ambiance', save.settings.ambianceMute)
	setMuted('music', save.settings.musicMute)
	setMuted('soundEffects', save.settings.soundEffectsMute)
}

export const initHowler = () => {
	Howler.volume(save.settings.volume / 100)
	setAllMuted()
}
type sounds = Record<soundAssets, Record<string, { volume: number }>>
const [localSoundData] = useLocalStorage<sounds>('soundsData', soundsData)

export type soundAssets = { [k in keyof typeof assets]: (typeof assets)[k] extends Record<string, Howl> ? k : never }[keyof typeof assets]

export const playSFX = <K extends string = string>(soundAsset: soundAssets) => (sound: K | K[] | 'random', options?: { playbackRate?: number, offset?: number, sprite?: string }) => {
	const selectedSound = sound === 'random'
		? getRandom(Object.keys(assets[soundAsset]))
		: Array.isArray(sound)
			? getRandom(sound)
			: sound
	const soundPlayer = assets[soundAsset][selectedSound]
	const volume = localSoundData[soundAsset][selectedSound]?.volume ?? 1
	soundPlayer.volume(volume * save.settings.soundEffectsVolume / 100)
	if (options?.playbackRate) {
		soundPlayer.rate(options.playbackRate)
	}
	const id = soundPlayer.play(options?.sprite)
	const duration = soundPlayer.duration(options?.sprite ? id : undefined)
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve()
		}, Math.max(duration * 1000 / (options?.playbackRate ?? 1) + (options?.offset ?? 0), 1))
	})
}
export const playSound = playSFX<soundEffects>('soundEffects')
export const playVoice = playSFX('voices')
export const playStep = playSFX('steps')
