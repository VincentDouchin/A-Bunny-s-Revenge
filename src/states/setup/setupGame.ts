import { throttle } from '@solid-primitives/scheduled'
import { Vector2 } from 'three'
import { Armabee, bosses, FlowerBoar, MossBoar } from '@/constants/enemies'
import { selectedBoss } from '@/debug/debugUi'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { settings, time } from '@/global/init'
import { updateRenderSize } from '@/global/rendering'
import { app } from '@/global/states'
import { Direction } from '@/lib/directions'
import { windowEvent } from '@/lib/uiManager'
import { startIntro } from '@/quests/introQuest'
import { assignPlanAndEnemies, RoomType } from '../dungeon/generateDungeon'
import { setMainCameraPosition } from '../mainMenu/mainMenuRendering'

export const setupGame = async () => {
	if (!params.skipMainMenu) {
		app.enable('mainMenu')
		return
	}
	app.enable('game')
	if (window.location.search.includes('testDialog')) {
		app.enable('testDialog')
		updateRenderSize()
		updateCameraZoom()
	} else	if (params.debugBoss) {
		const bossRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null }, type: RoomType.Boss }], 0)
		bossRoom[0].enemies = [bosses[selectedBoss.boss](0)]
		app.enable('dungeon', { dungeon: bossRoom[0], direction: Direction.S, firstEntry: true, playerHealth: 10, dungeonLevel: 0, weapon: 'Hoe' })
		updateRenderSize()
		updateCameraZoom()
	} else if (params.debugEnemies) {
		const enemiesRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null, east: null }, type: RoomType.Battle }], 0)
		enemiesRoom[0].enemies = [Armabee(1), FlowerBoar(1), MossBoar(1)]
		enemiesRoom[0].type = RoomType.Battle
		app.enable('dungeon', { dungeon: enemiesRoom[0], direction: Direction.S, firstEntry: true, playerHealth: 5, dungeonLevel: 0, weapon: 'SwordWeapon' })
		updateRenderSize()
		updateCameraZoom()
	} else if (params.debugIntro) {
		await app.enable('intro')
		setTimeout(() => startIntro(), 2000)
		app.disable('cutscene')
		updateRenderSize()
	} else {
		app.enable('farm', { door: null })
		updateRenderSize()
		updateCameraZoom()
	}
}

export const stopOnLosingFocus = () => {
	const listener = () => {
		if (document.hidden) {
			app.pause()
			time.stop()
		} else {
			time.start()
			app.start()
		}
	}
	const blurListener = () => {
		app.pause()
		time.stop()
		Howler.mute(true)
	}
	const focusListener = () => {
		time.start()
		app.start()
		Howler.mute(settings.mute)
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
			app.pause()
			addLandscapeElement()
		} else {
			app.start()
			removeLandscapeElement()
		}
	}
	const mediaMatch = window.matchMedia('(orientation: portrait)')
	if (mediaMatch.matches) {
		app.pause()
		addLandscapeElement()
	}
	mediaMatch.addEventListener('change', listener)

	return () => mediaMatch.removeEventListener('change', listener)
}
export const enableFullscreen = () => windowEvent('pointerup', () => {
	if (settings.fullscreen) {
		document.documentElement.requestFullscreen()
	}
})

export const resize = () => windowEvent('resize', throttle(() => {
	if (app.isEnabled('mainMenu')) {
		updateCameraZoom()
		updateRenderSize(new Vector2(window.innerWidth, window.innerHeight))
		setMainCameraPosition()
	} else {
		updateRenderSize()
		updateCameraZoom()
	}
}, 100))