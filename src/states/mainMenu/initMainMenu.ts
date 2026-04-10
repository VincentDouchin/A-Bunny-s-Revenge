import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { coroutines, ecs, time } from '@/global/init'
import { gameRenderGroupQuery } from '@/rendering/passes'
import { MainMenuBackgroundMaterial } from '@/shaders/mainMenuBackgroundMaterial'
import { AmbientLight, Group, Mesh, PerspectiveCamera, PlaneGeometry, Scene, Vector3 } from 'three/webgpu'
import { MainMenuBook } from './book'

const ZOOM_OUT = -5

const addBackground = (scene: Scene) => {
	const mat = new MainMenuBackgroundMaterial()
	const background = new Mesh(new PlaneGeometry(20, 10), mat)
	const coroutine = coroutines.add(function* () {
		const now = Date.now()
		while (true) {
			mat.time.value = now - Date.now()
			// mat.resolution.value = new Vector2(window.innerWidth, window.innerHeight)
			mat.needsUpdate = true
			yield
		}
	})
	background.rotateX(-Math.PI / 2)
	background.addEventListener('removed', coroutine)
	scene.add(background)
}

export const intiMainMenuRendering = () => {
	const gameRenderGroup = gameRenderGroupQuery.first
	if (!gameRenderGroup) return
	const scene = new Scene()
	scene.add(new AmbientLight(undefined, 1.5))
	updateCameraZoom(params.zoom + ZOOM_OUT)
	const mainMenuRenderGroup = ecs.add({
		scene,
		renderGroup: RenderGroup.MainMenu,
		stateEntity: 'mainMenu',
		group: new Group(),
	})
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000)
	camera.name = 'mainMenu'
	ecs.add({
		camera,
		parent: mainMenuRenderGroup,
		renderGroup: RenderGroup.MainMenu,
		stateEntity: 'mainMenu',
	})
	camera.position.set(0, 3, 0.2)
	camera.lookAt(new Vector3())

	addBackground(scene)
	const menuBook = new MainMenuBook(gameRenderGroup.renderPipeline.targets.final.texture)
	scene.add(menuBook)
	ecs.add({
		menuBook,
		stateEntity: 'mainMenu',
		withTimeUniform() {
			menuBook.pageRightTexture.needsUpdate = true
			menuBook.windowShader.house.needsUpdate = true
			menuBook.windowShader.time.value = time.elapsed
		},
	})
}
