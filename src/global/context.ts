export const context = {
	save: 'save',
}

interface Params {
	renderWidth: number
	cameraOffsetX: number
	cameraOffsetY: number
	cameraOffsetZ: number
	zoom: number
	fov: number
	speedUp: number
	dialogSpeed: number
	pixelation: boolean

}

export const params: Params = {
	pixelation: true,
	renderWidth: 360,
	cameraOffsetX: 0,
	cameraOffsetY: 75,
	cameraOffsetZ: -100,
	zoom: 6,
	fov: 50,
	speedUp: 1,
	dialogSpeed: 1,

}