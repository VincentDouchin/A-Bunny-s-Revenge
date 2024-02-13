import { PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { ecs, time } from './init'
import { debugState } from '@/debug/debugState'

export const camera = new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000)

export const initCamera = () => {
	camera.zoom = window.innerWidth / window.innerHeight / params.zoom
	camera.updateProjectionMatrix()
	ecs.add({ camera, position: new Vector3(), mainCamera: true, cameraLookat: new Vector3() })
}
const cameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookat')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('door', 'position')
export const moveCamera = () => {
	for (const { position, camera, cameraLookat, cameraOffset } of cameraQuery) {
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
		if (!debugState.enabled) {
			cameraLookat.lerp(target, time.delta / 1000 * 5)
			camera.lookAt(cameraLookat)
			position.set(...cameraLookat.clone().add(cameraOffset ?? new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)).toArray())
			camera.zoom = window.innerWidth / window.innerHeight / params.zoom
			camera.fov = params.fov
		}
	}
}

export const initializeCameraPosition = () => ecs.with('initialCameratarget', 'position').onEntityAdded.subscribe((e) => {
	for (const camera of cameraQuery) {
		camera.cameraLookat.set(...e.position.toArray())
		ecs.removeComponent(e, 'initialCameratarget')
	}
})