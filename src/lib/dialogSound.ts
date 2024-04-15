import { assets } from '@/global/init'
import { playVoice } from '@/global/sounds'

export const soundDialog = async (dialog: string) => {
	const filteredDialog = dialog.replace(/[^a-zA-Z\s]/g, '')
	for (const letter of filteredDialog) {
		if (letter === ' ') {
			await new Promise<void>(resolve => setTimeout(resolve, 50))
		} else {
			if (letter in assets.voices) {
				await playVoice(letter, { playbackRate: 3, offset: -100, volume: 0.1 })
			}
		}
	}
}
