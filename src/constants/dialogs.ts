import type { Dialog } from '@/global/entity'

export const dialogs = {
	*Panda() {
		while (true) {
			yield 'hello'
			yield 'What a beautiful day we\'re having!'
			yield
		}
	},
} as const satisfies Partial<Record<string, () => Dialog>>