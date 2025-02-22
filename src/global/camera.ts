import { Direction } from '@/lib/directions'
import { easeOut } from 'popmotion'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { params } from './context'
import { RenderGroup } from './entity'
import { ecs, levelsData, settings, tweens } from './init'
import { app } from './states'

export const initCamera = () => {
	const h = 600
	const w = h * window.innerWidth / window.innerHeight
	const camera = new OrthographicCamera(
		-w / 2 / params.zoom,
		w / 2 / params.zoom,
		h / 2 / params.zoom,
		-h / 2 / params.zoom,
		0.000000001,
		2000,
	)
	camera.updateProjectionMatrix()
	ecs.add({
		renderGroup: RenderGroup.Game,
		camera,
		fixedCamera: true,
		position: new Vector3(),
		mainCamera: true,
		cameraLookAt: new Vector3(),
		cameraShake: new Vector3(),
		cameraOffset: new Vector3(),
		cameraLerp: new Vector3(),
	})
}
const cameraQuery = ecs.with('camera')
const gameCameraQuery = ecs.with('camera', 'position', 'mainCamera', 'cameraLookAt', 'cameraShake', 'cameraLerp')
export const cameraTargetQuery = ecs.with('cameraTarget', 'worldPosition')
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
		const dir = new Vector3().randomDirection().multiplyScalar(40)
		tweens.add({
			from: 1,
			to: 0,
			duration: 500,
			ease: easeOut,
			onUpdate: (f) => {
				camera.cameraShake.lerpVectors(new Vector3(), dir, Math.cos(f * 50) * f)
			},
		})
	}
}
const OFFSET_Z = 30
const OFFSET_X = 50
const MAP_OFFSET = 10
const levelQuery = ecs.with('map')
export const moveCamera = (init = false) => () => {
	for (const { position, camera, cameraOffset, cameraShake, fixedCamera, cameraLerp } of gameCameraQuery) {
		const target = new Vector3()
		const lerpSpeed = 3 / 60
		if (app.isDisabled('mainMenu')) {
			for (const { worldPosition, targetRotation, state } of cameraTargetQuery) {
				target.copy(worldPosition)
				if (state?.current === 'running' && targetRotation) {
					cameraLerp.lerp(new Vector3(0, 0, 20).applyQuaternion(targetRotation), 1 / 60)
				} else {
					cameraLerp.lerp(new Vector3(), 3 / 60)
				}
				target.add(cameraLerp)
				const mapId = levelQuery.first?.map
				if (mapId) {
					const level = levelsData.levels.find(level => level.id === mapId)
					if (level && level.containCamera) {
						for (const door of doorsQuery) {
							switch (door.boundary) {
								case Direction.N : target.z = Math.min(target.z, door.position.z - OFFSET_Z)
									break
								case Direction.S : target.z = Math.max(target.z, door.position.z + OFFSET_Z)
									break
								case Direction.E : target.x = Math.max(target.x, door.position.x + OFFSET_X)
									break
								case Direction.W : target.x = Math.min(target.x, door.position.x - OFFSET_X)
									break
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

		if (app.isEnabled('debug')) return

		const offset = new Vector3(params.cameraOffsetX, params.cameraOffsetY, params.cameraOffsetZ)
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

export const initializeCameraPosition = () => ecs.with('initialCameraTarget', 'position').onEntityAdded.subscribe((e) => {
	for (const camera of gameCameraQuery) {
		camera.cameraLookAt.copy(e.position)
		ecs.removeComponent(e, 'initialCameraTarget')
	}
})