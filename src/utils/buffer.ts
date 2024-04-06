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
export const scaleCanvas = (canvas: HTMLCanvasElement, scale: number | { x: number, y: number }) => {
	const scaleX = typeof scale === 'number' ? scale : scale.x
	const scaleY = typeof scale === 'number' ? scale : scale.y
	const newWidth = Math.floor(canvas.width * scaleX)
	const newHeight = Math.floor(canvas.height * scaleY)
	const newBuffer = getScreenBuffer(newWidth, newHeight)
	newBuffer.drawImage(canvas, 0, 0, newWidth, newHeight)
	return newBuffer.canvas
}
export const imgToCanvas = (img: HTMLImageElement | HTMLCanvasElement) => {
	const buffer = getScreenBuffer(img.width, img.height)
	buffer.drawImage(img, 0, 0)
	return buffer
}
export const cloneCanvas = imgToCanvas