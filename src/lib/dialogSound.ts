import type { voices } from '@assets/assets'
import { playVoice } from '@/global/sounds'

export const soundDialog = async (voice: voices, dialog: string = '') => {
	const filteredDialog = dialog.replace(/[^a-zA-Z\s]/g, '').toLocaleLowerCase()
	for (const sprite of filteredDialog) {
		if (sprite === ' ') {
			await new Promise<void>(resolve => setTimeout(resolve, 50))
		} else {
			await playVoice(voice, { offset: -30, sprite })
		}
	}
}
