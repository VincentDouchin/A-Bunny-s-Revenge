export const context = {
	save: 'save',
}

interface Params extends Record<string, any> {
	renderHeight: number
	zoom: number
	speedUp: number
	dialogSpeed: number
	pixelation: boolean
	skipMainMenu: boolean
	debugBoss: boolean
	debugEnemies: boolean
	debugIntro: boolean
	language: 'en' | 'fr'
}

export const params: Params = {
	pixelation: true,
	renderHeight: 225,
	zoom: 9,
	speedUp: 1,
	dialogSpeed: 1,
	skipMainMenu: false,
	debugBoss: false,
	debugIntro: false,
	debugEnemies: false,
	language: 'en',
}