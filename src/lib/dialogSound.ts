import { PitchShift, Player } from 'tone'
import { assets } from '@/global/init'

export const soundDialog = async (dialog: string) => {
	const filteredDialog = dialog.replace(/[^a-zA-Z\s]/g, '')
	for (const letter of filteredDialog) {
		if (letter === ' ') {
			await new Promise<void>(resolve => setTimeout(resolve, 150))
		} else {
			const soundPath = assets.voices[letter]
			if (!soundPath) continue
			await new Promise<void>((resolve) => {
				const sound = new Player(soundPath.buffer)
				sound.playbackRate = 2
				const pitch = new PitchShift(Math.random() * 5 / 12).toDestination()
				sound.connect(pitch)
				sound.start()
				sound.onstop = () => {
					sound.dispose()
					pitch.dispose()
				}
				setTimeout(() => {
					resolve()
				}, sound.buffer.duration * 1000 / 2 - 50)
			})
		}
	}
}