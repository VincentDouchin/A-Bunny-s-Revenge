import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { inputManager } from './init'
import { gameCameraQuery } from '@/states/mainMenu/mainMenuRendering'
import { throttle } from '@/lib/state'

export const updateMousePosition = () => {
	const mousePosition = new Vector2()
	const rayCatcher = new Plane(new Vector3(0, 1, 0), 0)
	const ray = new Raycaster()
	const mouseMoveDebouced = throttle(100, (e: MouseEvent) => {
		mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1
		mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1
	})
	window.addEventListener('mousemove', mouseMoveDebouced, false)
	return () => {
		const cam = gameCameraQuery.first
		if (cam) {
			const { camera } = cam

			ray.setFromCamera(mousePosition, camera)
			ray.ray.intersectPlane(rayCatcher, inputManager.mouseWorldPosition)
		}
	} }