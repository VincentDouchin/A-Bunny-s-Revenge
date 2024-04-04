import { Tween } from '@tweenjs/tween.js'
import { OrthographicCamera, PerspectiveCamera, Vector2, Vector3 } from 'three'
import { params } from './context'
import { RenderGroup } from './entity'
import { ecs, time } from './init'
import { renderer } from './rendering'
import { debugState } from '@/debug/debugState'

const ZOOM_RATIO = window.innerWidth / window.innerHeight
export const initCamera = () => {
	const size = new Vector2()
	renderer.getSize(size)
	const camera = new OrthographicCamera(
		-size.x / 2 / params.zoom * ZOOM_RATIO,
		size.x / 2 / params.zoom * ZOOM_RATIO,
		size.y / 2 / params.zoom * ZOOM_RATIO,
		-size.y / 2 / params.zoom * ZOOM_RATIO,
		0.0001,
		1000,
	)
	camera.updateProjectionMatrix()
	ecs.add({
		renderGroup: RenderGroup.Game,
		camera,
		lockX: true,
		position: new Vector3(),
		mainCamera: true,
		cameraLookat: new Vector3(),
		cameraShake: new Vector3(),
	})
}
const cameraQuery = ecs.with('camera')
const gameCameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookat', 'cameraShake', 'lockX')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('door', 'position')
export const updateCameraZoom = (zoom: number = params.zoom) => {
	for (const { camera } of cameraQuery) {
		const size = new Vector2()
		renderer.getSize(size)
		if (camera instanceof OrthographicCamera) {
			camera.left = -size.x / 2 / zoom * ZOOM_RATIO
			camera.right = size.x / 2 / zoom * ZOOM_RATIO
			camera.top = size.y / 2 / zoom * ZOOM_RATIO
			camera.bottom = -size.y / 2 / zoom * ZOOM_RATIO
			camera.updateProjectionMatrix()
		}
		if (camera instanceof PerspectiveCamera) {
			camera.aspect = window.innerWidth / window.innerHeight
			camera.updateProjectionMatrix()
		}
	}
}

export const addCameraShake = () => {
	const camera = gameCameraQuery.first
	if (camera) {
		const randomTween = (amount: number) => new Tween(camera.cameraShake).to(new Vector3().randomDirection().normalize().multiplyScalar(amount / 10), 20).repeat(1).yoyo(true)
		const tween = randomTween(11)
		let lastTween = tween
		for (let i = 10; i > 0; i--) {
			const newTween = randomTween(i)
			lastTween.chain(newTween)
			lastTween = newTween
		}
		ecs.add({ tween, autoDestroy: true })
	}
}
const OFFSET = -50
export const moveCamera = (init = false) => () => {
	for (const { position, camera, cameraLookat, cameraOffset, cameraShake, lockX } of gameCameraQuery) {
		const target = new Vector3()
		for (const { worldPosition } of cameraTargetQuery) {
			target.copy(worldPosition)
			for (const door of doorsQuery) {
				if (door.door === 'north') {
					target.z = Math.min(worldPosition.z, door.position.z - OFFSET)
				}
				if (door.door === 'south') {
					target.z = Math.max(worldPosition.z, door.position.z + OFFSET)
				}
				if (door.door === 'west') {
					target.x = Math.min(worldPosition.x, door.position.x - OFFSET)
				}
				if (door.door === 'east') {
					target.x = Math.max(worldPosition.x, door.position.x + OFFSET)
				}
			}
		}
		if (!debugState.enabled) {
			const lerpSpeed = time.delta / 1000 * 5
			if (cameraTargetQuery.size > 0) {
				if (init) {
					cameraLookat.copy(target)
				} else {
					cameraLookat.lerp(target, lerpSpeed)
				}
			}

			cameraLookat.add({ x: cameraShake.x, y: 0, z: cameraShake.y })
			camera.lookAt(cameraLookat)
			const newPosition = cameraLookat.clone().add(cameraOffset ?? new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ))
			if (init) {
				position.copy(newPosition)
			} else {
				position.lerp(newPosition, lerpSpeed)
			}
			if (lockX) {
				position.setX(newPosition.x)
			}
		}
	}
}

export const initializeCameraPosition = () => ecs.with('initialCameratarget', 'position').onEntityAdded.subscribe((e) => {
	for (const camera of gameCameraQuery) {
		camera.cameraLookat.copy(e.position)
		ecs.removeComponent(e, 'initialCameratarget')
	}
})