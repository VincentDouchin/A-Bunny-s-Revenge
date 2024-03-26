import { Tween } from '@tweenjs/tween.js'
import { OrthographicCamera, Vector3 } from 'three'
import { params } from './context'
import { ecs, time } from './init'
import { height, width } from './rendering'
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
	// const camera = new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000)
	// camera.zoom = window.innerWidth / window.innerHeight / params.zoom
	camera.updateProjectionMatrix()
	ecs.add({
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
export const moveCamera = () => {
	for (const { position, camera, cameraLookat, cameraOffset, cameraShake, lockX } of cameraQuery) {
		const target = new Vector3()
		for (const { worldPosition } of cameraTargetQuery) {
			target.z = worldPosition.z
			target.x = worldPosition.x
			target.y += worldPosition.y
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
			cameraLookat.lerp(target, lerpSpeed)
			cameraLookat.add({ x: cameraShake.x, y: 0, z: cameraShake.y })
			camera.lookAt(cameraLookat)
			const newPosition = cameraLookat.clone().add(cameraOffset ?? new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ))
			position.lerp(newPosition, lerpSpeed)
			if (lockX) {
				position.setX(newPosition.x)
			}
		}
	}
}

export const initializeCameraPosition = () => ecs.with('initialCameratarget', 'position').onEntityAdded.subscribe((e) => {
	for (const camera of cameraQuery) {
		camera.cameraLookat.set(...e.position.toArray())
		ecs.removeComponent(e, 'initialCameratarget')
	}
})