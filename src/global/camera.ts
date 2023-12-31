import { PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { ecs } from './init'

export const camera = new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 100000)
// const aspect = window.innerWidth / window.innerHeight
// const CAMERA_SIZE = 20
// export const camera = new OrthographicCamera(-CAMERA_SIZE * aspect, CAMERA_SIZE * aspect, CAMERA_SIZE, -CAMERA_SIZE, 0.1, 100000)

export const initCamera = () => {
	camera.zoom = window.innerWidth / window.innerHeight / params.zoom
	camera.updateProjectionMatrix()
	ecs.add({ camera, position: new Vector3(), mainCamera: true })
}
const cameraQuery = ecs.with('camera', 'position', 'mainCamera')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
export const moveCamera = () => {
	for (const { position, camera } of cameraQuery) {
		for (const { worldPosition } of cameraTargetQuery) {
			camera.lookAt(worldPosition)
			position.x = worldPosition.x + params.cameraOffsetX
			position.y = worldPosition.y + params.cameraOffsetY
			position.z = worldPosition.z + params.cameraOffsetZ
			camera.zoom = window.innerWidth / window.innerHeight / params.zoom
			if (camera instanceof PerspectiveCamera) {
				camera.fov = params.fov
			}
			camera.updateProjectionMatrix()
		}
	}
}
