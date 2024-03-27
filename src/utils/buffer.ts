import { CanvasTexture } from 'three'

export const randomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`

export const getScreenBuffer = (width: number, height: number, willReadFrequently = false) => {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently })!
	return ctx
}
export const blankTexture = (w: number, h: number, color = 'red') => {
	const buffer = getScreenBuffer(w, h)
	buffer.fillStyle = color
	buffer.fillRect(0, 0, w, h)
	return new CanvasTexture(buffer.canvas)
}
export const scaleCanvas = (canvas: HTMLCanvasElement, scale: number) => {
	const newWidth = Math.floor(canvas.width * scale)
	const newHeight = Math.floor(canvas.height * scale)
	const newBuffer = getScreenBuffer(newWidth, newHeight)
	newBuffer.drawImage(canvas, 0, 0, newWidth, newHeight)
	return newBuffer.canvas
}