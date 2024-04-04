export const context = {
	save: 'save',
}

interface Params {
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
}

export const params: Params = {
	pixelation: true,
	renderHeight: 225,
	cameraOffsetX: 0,
	cameraOffsetY: 75,
	cameraOffsetZ: -100,
	zoom: 7,
	fov: 50,
	speedUp: 1,
	dialogSpeed: 1,
	skipMainMenu: false,
}