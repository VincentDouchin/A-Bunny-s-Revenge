import { PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { ecs } from './init'

export const camera = new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000)

export const initCamera = () => {
	camera.zoom = window.innerWidth / window.innerHeight / params.zoom
	camera.updateProjectionMatrix()
	ecs.add({ camera, position: new Vector3(), mainCamera: true })
}
const cameraQuery = ecs.with('camera', 'position', 'mainCamera')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('door', 'position')
export const moveCamera = () => {
	for (const { position, camera } of cameraQuery) {
		const target = new Vector3()
		for (const { worldPosition } of cameraTargetQuery) {
			target.z = worldPosition.z
			target.x = worldPosition.x
			target.y += worldPosition.y
			for (const door of doorsQuery) {
				if (door.door === 'north') {
					target.z = Math.min(worldPosition.z, door.position.z - 20) + 10
				}
				if (door.door === 'south') {
					target.z = Math.max(worldPosition.z, door.position.z + 20) + 10
				}
				if (door.door === 'west') {
					target.x = Math.min(worldPosition.x, door.position.x - 20)
				}
				if (door.door === 'east') {
					target.x = Math.max(worldPosition.x, door.position.x + 20)
				}
			}
		}
		camera.lookAt(target)
		position.set(...target.add(new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)).toArray())
		camera.zoom = window.innerWidth / window.innerHeight / params.zoom
		camera.fov = params.fov
		camera.updateProjectionMatrix()
	}
}
