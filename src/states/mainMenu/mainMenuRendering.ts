import { Easing, Tween } from '@tweenjs/tween.js'
import type { MeshStandardMaterial, ShaderMaterial } from 'three'
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, NearestFilter, PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3 } from 'three'
import { basketFollowPlayer, spawnBasket } from '../game/spawnBasket'
import { playerBundle } from '../game/spawnPlayer'
import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { assets, coroutines, ecs } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { renderer, updateRenderSize } from '@/global/rendering'
import { cutSceneState, mainMenuState } from '@/global/states'
import type { direction } from '@/lib/directions'
import { drawnHouseShader } from '@/shaders/drawnHouseShader'
import { imgToCanvas } from '@/utils/buffer'
import { doorQuery, leaveHouse, setSensor } from '@/utils/dialogHelpers'
import { windowEvent } from '@/lib/uiManager'

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

export const intiMainMenuRendering = () => {
	const scene = new Scene()
	const group = new Group()
	scene.add(group)
	const mainMenuRenderGroup = ecs.add({
		renderer,
		scene,
		renderGroup: RenderGroup.MainMenu,
		group,
		stateEntity: mainMenuState,
	})
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000)
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

	const ball = new Mesh(new SphereGeometry(0.1), new MeshBasicMaterial({ color: 0xFF0000 }))
	ball.position.set(-0.5, 2, 0)
}

export const mainMenuRenderGroupQuery = ecs.with('renderer', 'scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.MainMenu)

export const cameraQuery = ecs.with('camera', 'renderGroup', 'position')
const mainMenuCameraQuery = cameraQuery.where(e => e.renderGroup === RenderGroup.MainMenu)
const gameCameraQuery = cameraQuery.with('cameraLookat').where(e => e.renderGroup === RenderGroup.Game)
export const setMainCameraPosition = () => {
	for (const camera of gameCameraQuery) {
		camera.cameraLookat.x = 20
		camera.cameraLookat.y = 20
		camera.cameraLookat.z = 20
	}
}

export const renderMainMenu = () => {
	for (const { scene, renderer } of mainMenuRenderGroupQuery) {
		for (const camera of mainMenuCameraQuery) {
			renderer.setRenderTarget(null)
			renderer.render(scene, camera.camera)
		}
	}
}

const menuTextureQuery = ecs.with('menuSelected', 'menuInputs', 'menuTexture', 'windowShader')
const houseQuery = ecs.with('npcName', 'worldPosition', 'houseAnimator', 'rotation', 'collider').where(e => e.npcName === 'Grandma')
export const continueGame = (windowShader: ShaderMaterial) => {
	const ratio = window.innerWidth / window.innerHeight
	const finalResolution = new Vector2(params.renderWidth, params.renderWidth / ratio)
	ecs.add({
		tween: new Tween([0]).to([1], 4000)
			.easing(Easing.Quadratic.InOut)
			.onUpdate(([f]) => {
				const mainMenuCam = mainMenuCameraQuery.first
				const gameCam = gameCameraQuery.first
				const house = houseQuery.first
				if (mainMenuCam && mainMenuCam.camera instanceof PerspectiveCamera) {
					mainMenuCam.position.x = -1.5 * f
					mainMenuCam.camera.zoom = 7 * f + 1
					mainMenuCam.camera.updateProjectionMatrix()
					windowShader.uniforms.parchmentMix.value = 0.3 * f + 0.7
					windowShader.uniforms.windowSize.value = f * 0.5
					const newSize = finalResolution.clone().add(new Vector2(window.innerWidth, window.innerHeight).sub(finalResolution).multiplyScalar(1 - f))
					updateRenderSize(newSize)
					windowShader.uniforms.resolution.value = newSize
					windowShader.uniforms.kSize.value = 1 + 4 * (1 - f)
					updateCameraZoom(6 + 4 * (1 - f))
				}
				if (gameCam && house) {
					gameCam.cameraLookat.x = 20 - (20 - house.worldPosition.x) * f
					gameCam.cameraLookat.z = 20 - (20 - house.worldPosition.z) * f
					gameCam.cameraLookat.y = 20 - (20 - house.worldPosition.y) * f
				}
			})
			.onComplete(() => {
				mainMenuState.disable()
			}),
		autoDestroy: true,
	})
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
				ecs.removeComponent(mainMenu, 'menuSelected')
				continueGame(mainMenu.windowShader)
			}
		}
	}
}
const mainMenuButtonsQuery = ecs.with('model', 'menuButton')
export const clickOnMenuButton = () => {
	const click = (x: number, y: number) => {
		for (const camera of mainMenuCameraQuery) {
			const ray = new Raycaster()
			ray.setFromCamera(new Vector2(x, y), camera.camera)
			for (const { model, menuButton } of mainMenuButtonsQuery) {
				if (ray.intersectObject(model)) {
					if (menuButton === 'Continue') {
						for (const mainMenu of menuTextureQuery) {
							ecs.removeComponent(mainMenu, 'menuSelected')
							continueGame(mainMenu.windowShader)
						}
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