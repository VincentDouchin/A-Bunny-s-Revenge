import { easeInOut } from 'popmotion'
import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from '../game/spawnPlayer'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { ecs, inputManager, save, tweens } from '@/global/init'
import { getTargetSize, updateRenderSize } from '@/global/rendering'
import { campState, cutSceneState, introState, mainMenuState } from '@/global/states'
import { doorQuery, leaveHouse, setSensor } from '@/utils/dialogHelpers'
import { once } from '@/utils/mapFunctions'

export type MenuOptions = 'Continue' | 'New Game' | 'Settings' | 'Credits'

export const mainMenuRenderGroupQuery = ecs.with('renderer', 'scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.MainMenu)
const menuBookQuery = ecs.with('menuBook', 'menuInputs')
export const cameraQuery = ecs.with('camera', 'renderGroup', 'position')
const mainMenuCameraQuery = cameraQuery.where(e => e.renderGroup === RenderGroup.MainMenu)
export const gameCameraQuery = cameraQuery.with('cameraOffset').where(e => e.renderGroup === RenderGroup.Game)
const houseQuery = ecs.with('npcName', 'worldPosition', 'houseAnimator', 'rotation', 'collider').where(e => e.npcName === 'Grandma')
const playerMarkerQuery = ecs.with('player', 'position')
const getMainMenuCamTargetPos = () => {
	return houseQuery.first?.worldPosition ?? playerMarkerQuery.first?.position
}
export const setMainCameraPosition = () => {
	const worldPosition = getMainMenuCamTargetPos()
	if (!worldPosition) return
	for (const menuCam of mainMenuCameraQuery) {
		for (const gamecam of gameCameraQuery) {
			menuCam.camera.updateMatrixWorld()
			const offset = new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)
			// reset gamecam
			gamecam.position.copy(offset)
			gamecam.camera.lookAt(new Vector3())
			gamecam.camera.updateMatrixWorld()

			const screenPos = new Vector3(-1.5, 0, 0)
			screenPos.project(menuCam.camera)
			screenPos.unproject(gamecam.camera)

			gamecam.cameraOffset?.setX(worldPosition.x - screenPos.x)
			gamecam.cameraOffset?.setZ(worldPosition.z)
		}
	}
}

export const initMainMenuCamPos = [
	() => houseQuery.onEntityAdded.subscribe(setMainCameraPosition),
	() => playerMarkerQuery.onEntityAdded.subscribe(setMainCameraPosition),
]
export const renderMainMenu = () => {
	for (const { scene, renderer } of mainMenuRenderGroupQuery) {
		for (const camera of mainMenuCameraQuery) {
			renderer.setRenderTarget(null)
			renderer.render(scene, camera.camera)
		}
	}
}
export const setupWindow = () => {
	if (save.started) {
		campState.enable({})
	} else {
		introState.enable()
	}
}

export const transitionToGame = once(async () => {
	const mainMenuCam = mainMenuCameraQuery.first?.camera
	const book = menuBookQuery.first?.menuBook
	const finalResolution = getTargetSize()
	const gameCam = gameCameraQuery.first
	const worldPosition = getMainMenuCamTargetPos()
	if (gameCam && worldPosition && mainMenuCam && book) {
		const initialOffset = gameCam.cameraOffset.clone()
		tweens.add({
			from: 0,
			to: 1,
			duration: 4000,
			ease: [easeInOut],
			onUpdate: (f) => {
				const mainMenuCam = mainMenuCameraQuery.first

				if (mainMenuCam && mainMenuCam.camera instanceof PerspectiveCamera) {
					mainMenuCam.position.x = -1.5 * f
					mainMenuCam.camera.zoom = 10 * f + 1
					mainMenuCam.camera.updateProjectionMatrix()
					const newSize = finalResolution.clone().add(new Vector2(window.innerWidth, window.innerHeight).sub(finalResolution).multiplyScalar(1 - f))
					updateRenderSize(newSize)
					book.windowShader.uniforms.parchmentMix.value = 0.3 * f + 0.7
					book.windowShader.uniforms.windowSize.value = f * 0.5
					book.windowShader.uniforms.resolution.value = newSize
					book.windowShader.uniforms.kSize.value = 1 + 4 * (1 - f)
					gameCam.cameraOffset.lerpVectors(initialOffset, worldPosition, f)
					updateCameraZoom(params.zoom - 5 * (1 - f))
				}
			},
			onComplete: () => {
				mainMenuState.disable()
				save.started = true
				gameCam.cameraOffset.setScalar(0)
			},
		})
	}
})

export const selectMainMenu = () => {
	for (const { menuBook, menuInputs } of menuBookQuery) {
		if (menuInputs.get('up').justPressed) {
			menuBook.navigate(-1)
		}
		if (menuInputs.get('down').justPressed) {
			menuBook.navigate(1)
		}
		if (menuInputs.get('validate').justPressed) {
			menuBook.confirm()?.then(transitionToGame)
		}
	}
}

export const clickOnMenuButton = () => {
	for (const camera of mainMenuCameraQuery) {
		for (const { menuBook } of menuBookQuery) {
			const ray = new Raycaster()
			ray.setFromCamera(inputManager.mousePositionNormalized, camera.camera)
			for (const [button, model] of menuBook.buttons.entries()) {
				const intsersect = ray.intersectObject(model)
				if (intsersect.length) {
					menuBook.select(button)
					if (inputManager.mouse[0]) {
						menuBook.confirm()?.then(transitionToGame)
					}
				}
			}
		}
	}
}
export const spawnPlayerContinueGame = async () => {
	cutSceneState.enable()
	for (const house of houseQuery) {
		setSensor(houseQuery, true)
		setSensor(doorQuery, true)
		ecs.add({
			...playerBundle(PLAYER_DEFAULT_HEALTH, null),
			position: house.worldPosition.clone(),
			rotation: house.rotation.clone(),
			targetRotation: house.rotation.clone(),
		})
		await leaveHouse()
	}
	cutSceneState.disable()
}
