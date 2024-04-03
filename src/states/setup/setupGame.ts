import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { updateRenderSize } from '@/global/rendering'
import { save } from '@/global/save'
import { app, campState, mainMenuState } from '@/global/states'
import { windowEvent } from '@/lib/uiManager'

export const setupGame = async () => {
	if (!params.skipMainMenu) {
		mainMenuState.enable()
	} else {
		updateRenderSize()
		updateCameraZoom()
	}
	campState.enable({})
}

export const disablePortrait = () => {
	let landscapeElement: null | HTMLElement = null
	const addLandscapeElement = () => {
		landscapeElement = document.createElement('div')
		landscapeElement.classList.add('landscape-warning')
		document.body.appendChild(landscapeElement)
	}
	const removeLandscapeElement = () => {
		landscapeElement?.remove()
	}
	const listener = (e: MediaQueryListEvent) => {
		const portrait = e.matches

		if (portrait) {
			app.stop()
			addLandscapeElement()
		} else {
			app.start()
			removeLandscapeElement()
		}
	}
	const mediaMatch = window.matchMedia('(orientation: portrait)')
	if (mediaMatch.matches) {
		app.stop()
		addLandscapeElement()
	}
	mediaMatch.addEventListener('change', listener)

	return () => mediaMatch.removeEventListener('change', listener)
}
export const enableFullscreen = () => windowEvent('pointerdown', () => {
	if (save.settings.fullscreen) {
		document.documentElement.requestFullscreen()
	}
})

export const resize = () => windowEvent('resize', () => {
	updateRenderSize()
	updateCameraZoom()
})