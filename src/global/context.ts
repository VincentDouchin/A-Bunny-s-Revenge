export const context = {
	save: 'save',
}

interface Params extends Record<string, any> {
	renderHeight: number
	cameraOffsetX: number
	cameraOffsetY: number
	cameraOffsetZ: number
	zoom: number
	fov: number
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
	cameraOffsetX: 0,
	cameraOffsetY: 150,
	cameraOffsetZ: -200,
	zoom: 9,
	fov: 50,
	speedUp: 1,
	dialogSpeed: 1,
	skipMainMenu: false,
	debugBoss: false,
	debugIntro: false,
	debugEnemies: false,
	language: 'en',
}