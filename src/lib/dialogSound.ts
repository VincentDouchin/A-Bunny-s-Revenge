import type { AssetNames } from '@/global/entity'
import { playVoice } from '@/global/sounds'

export const soundDialog = (voice: AssetNames['voices'], dialog: string = '') => {
	let isCanceled = false
	const filteredDialog = dialog.replace(/[^a-z\s]/gi, '').toLocaleLowerCase().replace(/[^aeiou\W\d]/gi, '')
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
