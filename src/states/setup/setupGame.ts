import { Vector2 } from 'three'
import { setMainCameraPosition } from '../mainMenu/mainMenuRendering'
import { RoomType, assignPlanAndEnemies } from '../dungeon/generateDungeon'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { updateRenderSize } from '@/global/rendering'
import { save } from '@/global/save'
import { app, campState, dungeonState, mainMenuState } from '@/global/states'
import { windowEvent } from '@/lib/uiManager'
import { throttle } from '@/lib/state'
import { time } from '@/global/init'

export const setupGame = async () => {
	if (params.debugBoss) {
		const bossRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null }, type: RoomType.Boss }])
		dungeonState.enable({ dungeon: bossRoom[0], direction: 'south', firstEntry: true, playerHealth: 5, dungeonLevel: 0, weapon: 'Hoe' })
	} else	if (!params.skipMainMenu) {
		mainMenuState.enable()
		setMainCameraPosition()
		campState.enable({})
	} else {
		updateRenderSize()
		updateCameraZoom()
		campState.enable({})
	}
}

export const stopOnLosingFocus = () => {
	const listener = () => {
		if (document.hidden) {
			app.stop()
		} else {
			time.reset()
			app.start()
		}
	}
	document.addEventListener('visibilitychange', listener)
	return () => document.removeEventListener('visibilitychange', listener)
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
export const enableFullscreen = () => windowEvent('pointerup', () => {
	if (save.settings.fullscreen) {
		document.documentElement.requestFullscreen()
	}
})

export const resize = () => windowEvent('resize', throttle(100, () => {
	updateRenderSize()
	updateCameraZoom()
	if (mainMenuState.enabled) {
		updateRenderSize(new Vector2(window.innerWidth, window.innerHeight))
		updateCameraZoom(10)
	}
}))