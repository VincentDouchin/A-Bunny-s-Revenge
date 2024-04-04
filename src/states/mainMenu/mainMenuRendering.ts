import { Easing, Tween } from '@tweenjs/tween.js'
import type { MeshStandardMaterial } from 'three'
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, NearestFilter, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from 'three'
import { basketFollowPlayer, spawnBasket } from '../game/spawnBasket'
import { playerBundle } from '../game/spawnPlayer'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { assets, coroutines, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { getTargetSize, renderer, updateRenderSize } from '@/global/rendering'
import { cutSceneState, mainMenuState } from '@/global/states'
import type { direction } from '@/lib/directions'
import { windowEvent } from '@/lib/uiManager'
import { drawnHouseShader } from '@/shaders/drawnHouseShader'
import { imgToCanvas } from '@/utils/buffer'
import { doorQuery, leaveHouse, setSensor } from '@/utils/dialogHelpers'

export type MenuOptions = 'Continue' | 'New Game' | 'Settings' | 'Credits'

const drawUnderline = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number) => {
	ctx.globalAlpha = 1
	const underline: HTMLImageElement = assets.textures.borders.source.data
	ctx.drawImage(underline, 0, 0, 150, underline.height, x - 100, y - underline.height / 2 - 30, 150, underline.height)
	ctx.drawImage(underline, underline.width - 150, 0, 150, underline.height, x + w - 50, y - underline.height / 2 - 30, 150, underline.height)
	ctx.globalAlpha = 0.8
}

const menu = ['Continue', 'New Game', 'Settings', 'Credits'] as const
const mainMenuTexture = (mat: MeshStandardMaterial) => {
	let selected = 0
	return (direction?: direction | null) => {
		if (direction === 'south') {
			selected = Math.min(selected + 1, menu.length - 1)
		}
		if (direction === 'north') {
			selected = Math.max(selected - 1, 0)
		}
		if (direction || direction === null) {
			const pageRight = imgToCanvas(assets.textures.parchment.source.data)
			const font = 'EnchantedLand'
			pageRight.globalAlpha = 0.8
			pageRight.fillStyle = '#2c1e31'
			pageRight.font = `bold 130px ${font}`
			pageRight.fillText('Fabled Recipes', 200, 200)
			pageRight.font = `normal 110px ${font}`
			let marginTop = 400
			const marginLeft = 250
			for (let i = 0; i < menu.length; i++) {
				const text = menu[i]
				pageRight.fillText(text, marginLeft, marginTop)
				if (selected === i) {
					const { width } = pageRight.measureText(text)
					drawUnderline(pageRight, marginLeft, marginTop, width)
				}
				marginTop += 120
			}
			const pageRightTexture = new CanvasTexture(pageRight.canvas)
			pageRightTexture.magFilter = NearestFilter
			pageRightTexture.minFilter = NearestFilter
			mat.map = pageRightTexture
		}
		return menu[selected]
	}
}
const ZOOM_OUT = 2
const scene = new Scene()
export const intiMainMenuRendering = () => {
	updateCameraZoom(params.zoom + ZOOM_OUT)
	const group = new Group()
	scene.add(group)
	const mainMenuRenderGroup = ecs.add({
		renderer,
		scene,
		renderGroup: RenderGroup.MainMenu,
		group,
		stateEntity: mainMenuState,
	})
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000)
	camera.name = 'mainMenu'
	ecs.add({
		camera,
		position: new Vector3(0, 3, 0),
		parent: mainMenuRenderGroup,
		renderGroup: RenderGroup.MainMenu,
		stateEntity: mainMenuState,

	})
	camera.lookAt(new Vector3())
	const bookModel = assets.mainMenuAssets.book.scene.clone()
	bookModel.scale.setScalar(10)
	bookModel.rotateX(-Math.PI / 2)
	bookModel.rotateY(Math.PI / 2)
	scene.add(bookModel)
	const windowShader = drawnHouseShader()
	bookModel.traverse((node) => {
		if (node instanceof Mesh && node.name === 'pageleft') {
			node.material = windowShader
			ecs.add({
				model: node,
				withTimeUniform: true,
				stateEntity: mainMenuState,
			})
		}
		if (node instanceof Mesh && node.name === 'pageRight') {
			const menuTexture = mainMenuTexture(node.material)
			ecs.add({ menuSelected: 'Continue', menuTexture, ...menuInputMap(), windowShader, stateEntity: mainMenuState })
			menuTexture(null)
		}
		for (const text of menu) {
			if (node.name === text.replace(' ', '_') && node instanceof Mesh) {
				node.material = new MeshBasicMaterial({ transparent: true, opacity: 0 })
				ecs.add({ menuButton: text, model: node, stateEntity: mainMenuState })
			}
		}
	})
}

export const mainMenuRenderGroupQuery = ecs.with('renderer', 'scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.MainMenu)

export const cameraQuery = ecs.with('camera', 'renderGroup', 'position')
const mainMenuCameraQuery = cameraQuery.where(e => e.renderGroup === RenderGroup.MainMenu)
export const gameCameraQuery = cameraQuery.with('cameraLookat').where(e => e.renderGroup === RenderGroup.Game)
const houseQuery = ecs.with('npcName', 'worldPosition', 'houseAnimator', 'rotation', 'collider').where(e => e.npcName === 'Grandma')
export const setMainCameraPosition = () => {
	for (const menuCam of mainMenuCameraQuery) {
		for (const gamecam of gameCameraQuery) {
			for (const house of houseQuery) {
				const screenPos = new Vector3(-1.5, 0, 0)
				menuCam.camera.updateMatrixWorld()
				screenPos.project(menuCam.camera)
				const widthHalf = 0.5 * window.innerWidth
				const heightHalf = 0.5 * window.innerHeight
				screenPos.x = (screenPos.x * widthHalf) + widthHalf
				screenPos.y = -(screenPos.y * heightHalf) + heightHalf
				gamecam.position.set(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)
				gamecam.camera.lookAt(new Vector3())
				gamecam.camera.updateMatrixWorld()
				const worldPos = new Vector3()
				worldPos.x = (screenPos.x / renderer.domElement.width) * 2 - 1
				worldPos.y = -(screenPos.y / renderer.domElement.height) * 2 + 1
				worldPos.z = 0.5
				worldPos.unproject(gamecam.camera)

				gamecam.cameraLookat.x = house.worldPosition.x - worldPos.x
				gamecam.cameraLookat.y = 20
				gamecam.cameraLookat.z = 20
			}
		}
	}
}
export const initMainMenuCamPos = () => houseQuery.onEntityAdded.subscribe(setMainCameraPosition)

export const renderMainMenu = () => {
	for (const { scene, renderer } of mainMenuRenderGroupQuery) {
		for (const camera of mainMenuCameraQuery) {
			renderer.setRenderTarget(null)
			renderer.render(scene, camera.camera)
		}
	}
}

const menuTextureQuery = ecs.with('menuSelected', 'menuInputs', 'menuTexture', 'windowShader')
export const continueGame = (entities = menuTextureQuery.entities) => {
	for (const mainMenu of entities) {
		ecs.removeComponent(mainMenu, 'menuSelected')
		const finalResolution = getTargetSize()
		const gameCam = gameCameraQuery.first
		const house = houseQuery.first
		if (gameCam && house) {
			const initCameX = gameCam.cameraLookat.x
			ecs.add({
				tween: new Tween([0]).to([1], 4000)
					.easing(Easing.Quadratic.InOut)
					.onUpdate(([f]) => {
						const mainMenuCam = mainMenuCameraQuery.first

						if (mainMenuCam && mainMenuCam.camera instanceof PerspectiveCamera) {
							mainMenuCam.position.x = -1.5 * f
							mainMenuCam.camera.zoom = 10 * f + 1
							mainMenuCam.camera.updateProjectionMatrix()
							mainMenu.windowShader.uniforms.parchmentMix.value = 0.3 * f + 0.7
							mainMenu.windowShader.uniforms.windowSize.value = f * 0.5
							const newSize = finalResolution.clone().add(new Vector2(window.innerWidth, window.innerHeight).sub(finalResolution).multiplyScalar(1 - f))
							updateRenderSize(newSize)
							mainMenu.windowShader.uniforms.resolution.value = newSize
							mainMenu.windowShader.uniforms.kSize.value = 1 + 4 * (1 - f)
							updateCameraZoom(params.zoom + ZOOM_OUT * (1 - f))
						}

						gameCam.cameraLookat.x = initCameX - (initCameX - house.worldPosition.x) * f
						gameCam.cameraLookat.z = 20 - (20 - house.worldPosition.z) * f
						gameCam.cameraLookat.y = 20 - (20 - house.worldPosition.y) * f
					})
					.onComplete(() => {
						mainMenuState.disable()
					}),
				autoDestroy: true,
			})
		}
	}
}

export const selectMainMenu = () => {
	for (const mainMenu of menuTextureQuery) {
		if (mainMenu.menuInputs.get('down').justPressed) {
			mainMenu.menuTexture('south')
		}
		if (mainMenu.menuInputs.get('up').justPressed) {
			mainMenu.menuTexture('north')
		}
		if (mainMenu.menuInputs.get('validate').justPressed) {
			if (mainMenu.menuTexture() === 'Continue') {
				continueGame([mainMenu])
			}
		}
	}
}
const mainMenuButtonsQuery = ecs.with('model', 'menuButton')
export const clickOnMenuButton = () => {
	const click = (x: number, y: number) => {
		for (const camera of mainMenuCameraQuery) {
			const ray = new Raycaster()
			const pointer = new Vector2()
			pointer.x = (x / window.innerWidth) * 2 - 1
			pointer.y = -(y / window.innerHeight) * 2 + 1
			ray.setFromCamera(pointer, camera.camera)
			for (const { model, menuButton } of mainMenuButtonsQuery) {
				const intsersect = ray.intersectObject(model)
				if (intsersect.length) {
					if (menuButton === 'Continue') {
						continueGame()
					}
				}
			}
		}
	}
	const touchListener = (e: TouchEvent) => {
		for (const touch of e.changedTouches) {
			click(touch.clientX, touch.clientY)
		}
	}
	const clickListener = (e: MouseEvent) => click(e.clientX, e.clientY)
	const clickSub = windowEvent('touchstart', touchListener)
	const touchSub = windowEvent('click', clickListener)
	return () => {
		clickSub()
		touchSub()
	}
}
export const spawnPlayerContinueGame = async () => {
	cutSceneState.enable()
	for (const house of houseQuery) {
		setSensor(houseQuery, true)
		setSensor(doorQuery, true)
		ecs.add({
			...playerBundle(5, true, null),
			position: house.worldPosition.clone(),
			rotation: house.rotation.clone(),
		})
		const basket = spawnBasket()
		basket?.collider?.setSensor(true)
		const backetFollow = basketFollowPlayer(1, 2)
		coroutines.add(function*() {
			while (cutSceneState.enabled) {
				backetFollow()
				yield
			}
		})
		await leaveHouse()
	}
	cutSceneState.disable()
}
