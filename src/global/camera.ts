import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ecs } from './init'
import { rendererQuery, sceneQuery } from './rendering'
import { params } from './context'

export const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000)

export const initCamera = (debug: boolean = false) => () => {
	if (debug) {
		camera.position.set(0, params.cameraOffsetY, params.cameraOffsetZ)
		const [scene] = sceneQuery
		scene.scene.add(camera)
		ecs.add({ camera, mainCamera: true })
		const [renderer] = rendererQuery
		const controls = new OrbitControls(camera, renderer.renderer.domElement)
		ecs.add({ controls })
	} else {
		camera.zoom = window.innerWidth / window.innerHeight / 3
		camera.updateProjectionMatrix()
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
			position.y = worldPosition.y + params.cameraOffsetY
			position.z = worldPosition.z + params.cameraOffsetZ
			camera.updateProjectionMatrix()
		}
	}
}
