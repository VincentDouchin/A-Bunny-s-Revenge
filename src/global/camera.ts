import { Tween } from '@tweenjs/tween.js'
import { OrthographicCamera, Vector2, Vector3 } from 'three'
import { params } from './context'
import { RenderGroup } from './entity'
import { ecs, time } from './init'
import { height, renderer, width } from './rendering'
import { debugState } from '@/debug/debugState'

export const initCamera = () => {
	const camera = new OrthographicCamera(
		-width / 2 / params.zoom * window.innerWidth / window.innerHeight,
		width / 2 / params.zoom * window.innerWidth / window.innerHeight,
		height / 2 / params.zoom * window.innerWidth / window.innerHeight,
		-height / 2 / params.zoom * window.innerWidth / window.innerHeight,
		0.1,
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

const cameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookat', 'cameraShake', 'lockX')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('door', 'position')
export const updateCameraZoom = (zoom: number = 6) => {
	for (const { camera } of cameraQuery) {
		const size = new Vector2()
		renderer.getSize(size)
		if (camera instanceof OrthographicCamera) {
			camera.left = -size.x / 2 / zoom * window.innerWidth / window.innerHeight
			camera.right = size.x / 2 / zoom * window.innerWidth / window.innerHeight
			camera.top = size.y / 2 / zoom * window.innerWidth / window.innerHeight
			camera.bottom = -size.y / 2 / zoom * window.innerWidth / window.innerHeight
			camera.updateProjectionMatrix()
		}
	}
}

export const addCameraShake = () => {
	const camera = cameraQuery.first
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
	for (const { position, camera, cameraLookat, cameraOffset, cameraShake, lockX } of cameraQuery) {
		const target = new Vector3()
		for (const { worldPosition } of cameraTargetQuery) {
			target.x = worldPosition.x
			target.y = worldPosition.y
			target.z = worldPosition.z
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
	for (const camera of cameraQuery) {
		camera.cameraLookat.copy(e.position)
		ecs.removeComponent(e, 'initialCameratarget')
	}
})