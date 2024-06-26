import { Vector2 } from 'three'
import { RoomType, assignPlanAndEnemies } from '../dungeon/generateDungeon'
import { setMainCameraPosition } from '../mainMenu/mainMenuRendering'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { time } from '@/global/init'
import { updateRenderSize } from '@/global/rendering'
import { save } from '@/global/save'
import { app, campState, dungeonState, mainMenuState } from '@/global/states'
import { Direction } from '@/lib/directions'
import { throttle } from '@/lib/state'
import { windowEvent } from '@/lib/uiManager'

export const setupGame = async () => {
	if (params.debugBoss) {
		const bossRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null }, type: RoomType.Boss }], 0)
		dungeonState.enable({ dungeon: bossRoom[0], direction: Direction.S, firstEntry: true, playerHealth: 5, dungeonLevel: 0, weapon: 'Hoe' })
		updateRenderSize()
		updateCameraZoom()
	} else if (params.debugEnemies) {
		const enemiesRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null, east: null }, type: RoomType.Battle }], 0)
		enemiesRoom[0].enemies = ['Armabee']
		enemiesRoom[0].type = RoomType.Battle
		dungeonState.enable({ dungeon: enemiesRoom[0], direction: Direction.S, firstEntry: true, playerHealth: 5, dungeonLevel: 0, weapon: 'SwordWeapon' })
		updateRenderSize()
		updateCameraZoom()
	} else if (!params.skipMainMenu) {
		mainMenuState.enable()
		setMainCameraPosition()
		campState.enable({})
	} else {
		campState.enable({})
		updateRenderSize()
		updateCameraZoom()
	}
}

export const stopOnLosingFocus = () => {
	const listener = () => {
		if (document.hidden) {
			app.stop()
			time.stop()
		} else {
			time.start()
			app.start()
		}
	}
	const blurListener = () => {
		app.stop()
		time.stop()
		Howler.mute(true)
	}
	const focusListener = () => {
		time.start()
		app.start()
		Howler.mute(save.settings.mute)
	}
	document.addEventListener('visibilitychange', listener)
	window.addEventListener('blur', blurListener)
	window.addEventListener('focus', focusListener)
	return () => {
		document.removeEventListener('visibilitychange', listener)
		window.removeEventListener('blur', blurListener)
		window.removeEventListener('focus', focusListener)
	}
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