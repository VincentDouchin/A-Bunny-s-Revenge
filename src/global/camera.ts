import { Tween } from '@tweenjs/tween.js'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { RenderGroup } from './entity'
import { ecs, levelsData, time } from './init'
import { debugState } from '@/debug/debugState'

export const initCamera = () => {
	const h = 600
	const w = h * window.innerWidth / window.innerHeight

	const camera = new OrthographicCamera(
		-w / 2 / params.zoom,
		w / 2 / params.zoom,
		h / 2 / params.zoom,
		-h / 2 / params.zoom,
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
const gameCameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookat', 'cameraShake')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('door', 'position')
export const updateCameraZoom = (zoom: number = params.zoom) => {
	for (const { camera } of cameraQuery) {
		const h = 600
		const w = h * window.innerWidth / window.innerHeight
		if (camera instanceof OrthographicCamera) {
			camera.left = -w / 2 / zoom
			camera.right = w / 2 / zoom
			camera.top = h / 2 / zoom
			camera.bottom = -h / 2 / zoom
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
const OFFSETZ = 30
const OFFSETX = 50
const MAP_OFFSET = 10
const levelQuery = ecs.with('map')
export const moveCamera = (init = false) => () => {
	for (const { position, camera, cameraLookat, cameraOffset, cameraShake, lockX } of gameCameraQuery) {
		const target = new Vector3()
		for (const { worldPosition } of cameraTargetQuery) {
			target.copy(worldPosition)
			for (const door of doorsQuery) {
				if (door.door === 'north') {
					target.z = Math.min(target.z, door.position.z - OFFSETZ)
				}
				if (door.door === 'south') {
					target.z = Math.max(target.z, door.position.z + OFFSETZ)
				}
				if (door.door === 'west') {
					target.x = Math.min(target.x, door.position.x - OFFSETX)
				}
				if (door.door === 'east') {
					target.x = Math.max(target.x, door.position.x + OFFSETX)
				}
			}
			const mapId = levelQuery.first?.map
			if (mapId) {
				const levelSize = levelsData.levels.find(level => level.id === mapId)?.size
				if (levelSize && camera instanceof OrthographicCamera) {
					target.x = Math.min(target.x, levelSize.x / 2 + camera.left - MAP_OFFSET)
					target.x = Math.max(target.x, -levelSize.x / 2 + camera.right + MAP_OFFSET)
					target.z = Math.min(target.z, levelSize.y / 2 + camera.bottom - MAP_OFFSET * 4)
					target.z = Math.max(target.z, -levelSize.y / 2 + camera.top + MAP_OFFSET * 5)
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