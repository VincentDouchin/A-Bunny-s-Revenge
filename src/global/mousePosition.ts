import { gameCameraQuery } from '@/states/mainMenu/mainMenuRendering'
import { throttle } from '@solid-primitives/scheduled'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { inputManager } from './init'

export const updateMousePosition = () => {
	const mousePosition = new Vector2()
	const rayCatcher = new Plane(new Vector3(0, 1, 0), 0)
	const ray = new Raycaster()
	const mouseMoveDebouced = throttle((e: MouseEvent) => {
		mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1
		mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1
	}, 100)
	window.addEventListener('mousemove', mouseMoveDebouced, false)
	return () => {
		const cam = gameCameraQuery.first
		if (cam) {
			const { camera } = cam

			ray.setFromCamera(mousePosition, camera)
			ray.ray.intersectPlane(rayCatcher, inputManager.mouseWorldPosition)
		}
	} }