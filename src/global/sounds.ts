import type { soundEffects } from '@assets/assets'
import soundsData from '@assets/soundsData.json'
import { assets, settings } from './init'
import { useLocalStorage } from '@/utils/useLocalStorage'
import { getRandom } from '@/utils/mapFunctions'

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
	setMuted('global', settings.mute)
	setMuted('ambiance', settings.ambianceMute)
	setMuted('music', settings.musicMute)
	setMuted('soundEffects', settings.soundEffectsMute)
}

export const initHowler = () => {
	const init = () => {
		Howler.volume(settings.volume / 100)
		setAllMuted()
	}
	if (Howler.ctx.state === 'suspended') {
		Howler.ctx.onstatechange = () => {
			if (Howler.ctx.state === 'running') {
				init()
			}
		}
	} else {
		init()
	}
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
	soundPlayer.volume(volume * settings.soundEffectsVolume / 100)
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
