import soundsData from '@assets/soundsData.json'
import { getRandom, objectKeys } from '@/utils/mapFunctions'
import { useLocalStorage } from '@/utils/useLocalStorage'
import { assets, dayTime, musicManager, settings } from './init'

export type sounds = Partial<Record<string, Partial<Record<string, { volume: number }>>>>
export type soundAssets = { [K in { [k in keyof typeof assets]: (typeof assets)[k] extends Record<string, Howl> ? k : never }[keyof typeof assets]]: (typeof assets)[K] }
export const [localSoundData, setLocalSoundData] = useLocalStorage<sounds>('soundsData', soundsData as sounds)

const getSelectedSound = <S extends keyof soundAssets, K extends keyof soundAssets[S]>(soundAsset: S, sound: K | K[] | 'random') => {
	return (sound === 'random'
		? getRandom(objectKeys(assets[soundAsset]))
		: Array.isArray(sound)
			? getRandom(sound)
			: sound) as keyof soundAssets[S]
}

const getSound = <S extends keyof soundAssets, K extends keyof soundAssets[S]>(soundAsset: S, sound: K | K[] | 'random'): Howl => {
	const selected = getSelectedSound(soundAsset, sound)
	return assets[soundAsset][selected] as Howl
}

const setMuted = <S extends keyof soundAssets>(sounds: S | 'global', muted: boolean) => {
	if (sounds === 'global') {
		Howler.mute(muted)
	} else {
		for (const sound of objectKeys(assets[sounds])) {
			getSound(sounds, sound).mute(muted)
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

export const playSFX = <S extends keyof soundAssets>(soundAsset: S) => <K extends keyof soundAssets[S]>(sound: K | K[] | 'random', options?: { playbackRate?: number, offset?: number, sprite?: string }) => {
	const selectedSound = getSelectedSound(soundAsset, sound)
	const soundPlayer = getSound(soundAsset, selectedSound)
	const volume = localSoundData?.[soundAsset]?.[selectedSound]?.volume ?? 1
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
export const playSound = playSFX<'soundEffects'>('soundEffects')
export const playVoice = playSFX('voices')
export const playStep = playSFX<'steps'>('steps')

export const playAmbience = () => {
	if (dayTime.current >= 0.8 && dayTime.dayToNight === true) {
		musicManager.playAmbience('ambience_night')
	} else {
		musicManager.playAmbience('ambience_day')
	}
}