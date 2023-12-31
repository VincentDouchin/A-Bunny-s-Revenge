import { CanvasTexture } from 'three'

export const randomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`

export const getScreenBuffer = (width: number, height: number) => {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d', { alpha: true })!
	return ctx
}
export const blankTexture = (w: number, h: number, color = 'red') => {
	const buffer = getScreenBuffer(w, h)
	buffer.fillStyle = color
	buffer.fillRect(0, 0, w, h)
	return new CanvasTexture(buffer.canvas)
}