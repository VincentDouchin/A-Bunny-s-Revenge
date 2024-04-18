import { params } from './global/context'

export const dialog = {
	grandma: {
		hello: {
			en: 'Hello dear',
			fr: 'Bonjour ma petite',
		},
		howareyoudoing: {
			en: 'How are you doing?',
			fr: 'Comment vas-tu?',
		},
	},
} as const
export const t = (text: Readonly<Record<'en' | 'fr', string>>) => text[params.language]