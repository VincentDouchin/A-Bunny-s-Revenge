import { OrthographicCamera, Vector2 } from 'three'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { cameraQuery, updateRenderSize } from '@/global/rendering'
import { save } from '@/global/save'
import { app, campState, mainMenuState } from '@/global/states'

export const setupGame = async () => {
	if (!params.skipMainMenu) {
		mainMenuState.enable()
	} else {
		updateCameraZoom(6)
		const ratio = window.innerWidth / window.innerHeight
		const finalResolution = new Vector2(params.renderWidth, params.renderWidth / ratio)
		updateRenderSize(finalResolution)
		updateCameraZoom(6)
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
export const enableFullscreen = () => {
	const listener = () => {
		if (save.settings.fullscreen) {
			document.documentElement.requestFullscreen()
		}
	}
	window.addEventListener('pointerdown', listener)
	return () => window.removeEventListener('pointerdown', listener)
}

export const resize = () => {
	const listener = () => {
		const ratio = window.innerHeight / window.innerWidth
		const width = params.renderWidth
		const height = Math.round(width * ratio)

		// renderer.setSize(width, height)
		// cssRenderer.setSize(window.innerWidth, window.innerHeight)
		// target.setSize(width, height)
		const camera = cameraQuery.first?.camera
		if (camera instanceof OrthographicCamera) {
			camera.left = -width / 2 / params.zoom * window.innerWidth / window.innerHeight
			camera.right = width / 2 / params.zoom * window.innerWidth / window.innerHeight
			camera.top = height / 2 / params.zoom * window.innerWidth / window.innerHeight
			camera.bottom = -height / 2 / params.zoom * window.innerWidth / window.innerHeight
			camera.updateProjectionMatrix()
		}
	}
	window.addEventListener('resize', listener)
	return () => window.removeEventListener('resize', listener)
}