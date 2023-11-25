import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ecs } from './init'
import { rendererQuery, sceneQuery } from './rendering'

export const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000)

export const initCamera = (debug: boolean = false) => () => {
	if (debug) {
		camera.position.set(0, 20, -15)
		const [scene] = sceneQuery
		scene.scene.add(camera)
		ecs.add({ camera, mainCamera: true })
		const [renderer] = rendererQuery
		const controls = new OrbitControls(camera, renderer.renderer.domElement)

		ecs.add({ controls })
	} else {
		ecs.add({ camera, position: new Vector3(), mainCamera: true })
	}
}
const cameraQuery = ecs.with('camera', 'position', 'mainCamera')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
export const moveCamera = () => {
	for (const { position, camera } of cameraQuery) {
		for (const { worldPosition } of cameraTargetQuery) {
			camera.lookAt(worldPosition)
			position.x = worldPosition.x
			position.y = worldPosition.y + 20
			position.z = worldPosition.z - 15
			camera.updateProjectionMatrix()
		}
	}
}
