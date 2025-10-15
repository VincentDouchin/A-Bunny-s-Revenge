import { easeInOut } from 'popmotion'
import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { moveCamera, updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { ecs, inputManager, menuInputs, save, tweens } from '@/global/init'
import { getTargetSize, updateRenderSize } from '@/global/rendering'
import { app } from '@/global/states'
import { once } from '@/utils/mapFunctions'

export type MenuOptions = 'Continue' | 'New Game' | 'Settings' | 'Credits'

export const mainMenuRenderGroupQuery = ecs.with('renderer', 'scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.MainMenu)
const menuBookQuery = ecs.with('menuBook')
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
		for (const gameCam of gameCameraQuery) {
			menuCam.camera.updateMatrixWorld()
			const offset = new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)
			// reset gameCam
			gameCam.position.copy(offset)
			gameCam.position.copy(offset)
			gameCam.camera.lookAt(new Vector3())
			gameCam.camera.updateMatrixWorld()

			const screenPos = new Vector3(-1.5, 0, 0)
			screenPos.project(menuCam.camera)
			screenPos.unproject(gameCam.camera)

			gameCam.cameraOffset?.setX(worldPosition.x - screenPos.x)
			gameCam.cameraOffset?.setZ(worldPosition.z)
			moveCamera(true)()
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
		app.enable('farm', { door: 'clearing' })
	} else {
		app.enable('intro')
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
					updateRenderSize(newSize, f === 1)
					book.windowShader.uniforms.parchmentMix.value = 0.3 * f + 0.7
					book.windowShader.uniforms.windowSize.value = f * 0.5
					book.windowShader.uniforms.resolution.value = newSize
					book.windowShader.uniforms.kSize.value = 1 + 4 * (1 - f)
					gameCam.cameraOffset.lerpVectors(initialOffset, worldPosition, f)
					updateCameraZoom(params.zoom - 5 * (1 - f))
				}
			},
			onComplete: () => {
				app.enable('game')
				save.started = true
				gameCam.cameraOffset.setScalar(0)
			},
		})
	}
})

export const selectMainMenu = () => {
	for (const { menuBook } of menuBookQuery) {
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
				const intersect = ray.intersectObject(model)
				if (intersect.length) {
					menuBook.select(button)
					if (menuInputs.get('click').justPressed) {
						menuBook.confirm()?.then(transitionToGame)
					}
				}
			}
		}
	}
}
