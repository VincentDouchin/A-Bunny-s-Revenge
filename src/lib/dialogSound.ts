import type { voices } from '@assets/assets'
import { playVoice } from '@/global/sounds'

export const soundDialog = (voice: voices, dialog: string = '') => {
	let isCanceled = false
	const filteredDialog = dialog.replace(/[^a-z\s]/gi, '').toLocaleLowerCase()

	return {
		cancel: () => {
			isCanceled = true
		},
		play: async () => {
			for (const sprite of filteredDialog) {
				if (isCanceled) return
				if (sprite === ' ') {
					await new Promise<void>(resolve => setTimeout(resolve, 50))
				} else {
					await playVoice(voice, { offset: -30, sprite })
				}
			}
		},
	}
}
