import { debugState } from '@/debug/debugState'
import { Direction } from '@/lib/directions'
import { easeOut } from 'popmotion'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { RenderGroup } from './entity'
import { ecs, levelsData, settings, time, tweens } from './init'
import { mainMenuState } from './states'

const ZOOM = 9

export const initCamera = () => {
	const h = 600
	const w = h * window.innerWidth / window.innerHeight
	const camera = new OrthographicCamera(
		-w / 2 / ZOOM,
		w / 2 / ZOOM,
		h / 2 / ZOOM,
		-h / 2 / ZOOM,
		0.0001,
		1000,
	)
	// camera.rotateX(-0.3)
	camera.updateProjectionMatrix()
	ecs.add({
		renderGroup: RenderGroup.Game,
		camera,
		fixedCamera: true,
		position: new Vector3(),
		mainCamera: true,
		cameraLookat: new Vector3(),
		cameraShake: new Vector3(),
		cameraOffset: new Vector3(),
	})
}
const cameraQuery = ecs.with('camera')
const gameCameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookat', 'cameraShake')
export const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const doorsQuery = ecs.with('boundary', 'position').where(e => e.doorType === 'fog')
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
		const dir = new Vector3().randomDirection().multiplyScalar(5)
		tweens.add({
			from: 1,
			to: 0,
			duration: 500,
			ease: easeOut,
			onUpdate: (f) => {
				camera.cameraShake.lerpVectors(new Vector3(), dir, Math.cos(f * 20) * f)
			},
		})
	}
}
const OFFSETZ = 30
const OFFSETX = 50
const MAP_OFFSET = 10
const levelQuery = ecs.with('map')
export const moveCamera = (init = false) => () => {
	for (const { position, camera, cameraOffset, cameraShake, fixedCamera } of gameCameraQuery) {
		const target = new Vector3()
		if (mainMenuState.disabled) {
			for (const { worldPosition } of cameraTargetQuery) {
				target.copy(worldPosition)
				const mapId = levelQuery.first?.map
				if (mapId) {
					const level = levelsData.levels.find(level => level.id === mapId)
					if (level && level.containCamera) {
						for (const door of doorsQuery) {
							if (door.boundary === Direction.N) {
								target.z = Math.min(target.z, door.position.z - OFFSETZ)
							}
							if (door.boundary === Direction.S) {
								target.z = Math.max(target.z, door.position.z + OFFSETZ)
							}
							if (door.boundary === Direction.W) {
								target.x = Math.min(target.x, door.position.x - OFFSETX)
							}
							if (door.boundary === Direction.E) {
								target.x = Math.max(target.x, door.position.x + OFFSETX)
							}
						}
						const levelSize = level?.size
						if (camera instanceof OrthographicCamera) {
							target.x = Math.min(target.x, levelSize.x / 2 + camera.left - MAP_OFFSET)
							target.x = Math.max(target.x, -levelSize.x / 2 + camera.right + MAP_OFFSET)
							target.z = Math.min(target.z, levelSize.y / 2 + camera.bottom - MAP_OFFSET * 4)
							target.z = Math.max(target.z, -levelSize.y / 2 + camera.top + MAP_OFFSET * 5)
						}
					}
				}
			}
		}

		if (!debugState.enabled) {
			const lerpSpeed = time.delta / 1000 * 3
			const offset = new Vector3(0, 150, -200)
			const newPosition = target.clone().add({ x: cameraShake.x, y: 0, z: cameraShake.y })
			if (cameraOffset) {
				newPosition.add(cameraOffset)
			}
			if (fixedCamera) {
				newPosition.add(offset)
			}
			if (init || settings.lockCamera) {
				position.copy(newPosition)
			} else {
				position.lerp(newPosition, lerpSpeed)
			}
			if (fixedCamera) {
				camera.lookAt(position.clone().sub(offset))
			} else {
				camera.lookAt(target)
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