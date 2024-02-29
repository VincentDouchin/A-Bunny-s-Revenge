import { PitchShift, Player } from 'tone'
import { assets } from '@/global/init'

const playbackRate = 3

export const soundDialog = async (dialog: string) => {
	const filteredDialog = dialog.replace(/[^a-zA-Z\s]/g, '')
	for (const letter of filteredDialog) {
		if (letter === ' ') {
			await new Promise<void>(resolve => setTimeout(resolve, 50))
		} else {
			const soundPath = assets.voices[letter]
			if (!soundPath) continue
			await new Promise<void>((resolve) => {
				const sound = new Player(soundPath.buffer).toDestination()
				sound.playbackRate = playbackRate
				const pitch = new PitchShift({ pitch: -1, windowSize: 1 }).toDestination()
				sound.connect(pitch)
				sound.start()
				sound.onstop = () => {
					sound.dispose()
					pitch.dispose()
				}
				setTimeout(() => {
					resolve()
				}, sound.buffer.duration * 1000 / playbackRate - 50)
			})
		}
	}
}
