import { updateCameraZoom } from '@/global/camera'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { coroutines, ecs } from '@/global/init'
import { renderer } from '@/global/rendering'
import { Group, Mesh, PerspectiveCamera, PlaneGeometry, Scene, Vector3 } from 'three/webgpu'
// import { mainMenuBackgound } from '@/shaders/mainMenuBackground'
import { MainMenuBook } from './book'

const ZOOM_OUT = -5

const addBackground = (scene: Scene) => {
	const background = new Mesh(new PlaneGeometry(20, 10))
	const coroutine = coroutines.add(function* () {
		// const now = Date.now()
		// while (true) {
		// 	mainMenuBackgound.uniforms.time.value = now - Date.now()
		// 	mainMenuBackgound.uniforms.resolution.value = new Vector2(window.innerWidth, window.innerHeight)
		// 	mainMenuBackgound.needsUpdate = true
		// 	yield
		// }
	})
	background.rotateX(-Math.PI / 2)
	background.addEventListener('removed', coroutine)
	scene.add(background)
}

export const intiMainMenuRendering = () => {
	const scene = new Scene()
	updateCameraZoom(params.zoom + ZOOM_OUT)
	const mainMenuRenderGroup = ecs.add({
		renderer,
		scene,
		renderGroup: RenderGroup.MainMenu,
		stateEntity: 'mainMenu',
		group: new Group(),
	})
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000)
	camera.name = 'mainMenu'
	ecs.add({
		camera,
		position: new Vector3(0, 3, 0),
		parent: mainMenuRenderGroup,
		renderGroup: RenderGroup.MainMenu,
		stateEntity: 'mainMenu',
	})
	camera.lookAt(new Vector3())

	addBackground(scene)
	const menuBook = new MainMenuBook()
	scene.add(menuBook)
	ecs.add({
		menuBook,
		stateEntity: 'mainMenu',
		// withTimeUniform: menuBook.withTimeUniforms,
	})
}
