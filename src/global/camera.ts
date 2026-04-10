import { easeOut } from 'popmotion'
import { OrthographicCamera, PerspectiveCamera, Vector2, Vector3 } from 'three/webgpu'
import { params } from './context'
import { RenderGroup } from './entity'
import { assets, ecs, settings, tweens } from './init'
import { app } from './states'

export const initCamera = () => {
	const h = 600
	const w = (h * window.innerWidth) / window.innerHeight
	const camera = new OrthographicCamera(-w / 2 / params.zoom, w / 2 / params.zoom, h / 2 / params.zoom, -h / 2 / params.zoom, 0.000000001, 2000)
	camera.updateProjectionMatrix()
	ecs.add({
		renderGroup: RenderGroup.Game,
		camera,
		fixedCamera: true,
		mainCamera: true,
		cameraLookAt: new Vector3(),
		cameraShake: new Vector3(),
		cameraOffset: new Vector3(),
		cameraLerp: new Vector3(),
		subPixelOffset: new Vector2(),
	})
}
const cameraQuery = ecs.with('camera')
const gameCameraQuery = ecs.with('camera', 'mainCamera', 'cameraLookAt', 'cameraShake', 'cameraLerp')
export const cameraTargetQuery = ecs.with('cameraTarget', 'worldPosition')
const lockedOnQuery = ecs.with('lockedOn', 'position')
export const updateCameraZoom = (zoom: number = params.zoom) => {
	for (const { camera } of cameraQuery) {
		const h = 600
		const w = (h * window.innerWidth) / window.innerHeight
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
const OFFSET_Z = 40
const OFFSET_X = 30
const levelQuery = ecs.with('map')
export const moveCamera =
	(init = false) =>
	() => {
		for (const { camera, cameraOffset, cameraShake, fixedCamera, cameraLerp } of gameCameraQuery) {
			const target = new Vector3()
			const lerpSpeed = 3 / 60
			if (app.isDisabled('mainMenu')) {
				for (const entity of cameraTargetQuery) {
					const { worldPosition, targetRotation } = entity
					target.copy(worldPosition)
					const lockedOn = lockedOnQuery.entities.reduce<null | number>((acc, v) => {
						const dist = v.position.distanceTo(worldPosition) / 2
						if (acc === null || dist < acc) {
							return dist
						}
						return acc
					}, null)

					if (((entity.movementForce && entity.movementForce.length() >= 0.6) || lockedOn) && targetRotation) {
						const dist = Math.min(lockedOn ?? 0, 20)
						cameraLerp.lerp(new Vector3(0, 0, dist).applyQuaternion(targetRotation), 1 / 60)
					} else {
						cameraLerp.lerp(new Vector3(), 3 / 60)
					}
					target.add(cameraLerp)

					const mapId = levelQuery.first?.map
					if (mapId) {
						const level = assets.levels[mapId]
						if (level) {
							if (camera instanceof OrthographicCamera) {
								target.x = Math.min(target.x, level.sizeX / 2 + camera.left - OFFSET_X)
								target.x = Math.max(target.x, -level.sizeX / 2 + camera.right + OFFSET_X)
								target.z = Math.min(target.z, level.sizeY / 2 + camera.bottom - OFFSET_Z)
								target.z = Math.max(target.z, -level.sizeY / 2 + camera.top + OFFSET_Z)
							}
						}
					}
				}
			}

			if (app.isEnabled('debug')) return

			const offset = new Vector3(0, 150, 200)
			const newPosition = target.clone().add({ x: cameraShake.x, y: 0, z: cameraShake.y })
			if (cameraOffset) {
				newPosition.add(cameraOffset)
			}
			if (fixedCamera) {
				newPosition.add(offset)
			}
			if (init || settings.lockCamera) {
				camera.position.copy(newPosition)
			} else {
				camera.position.lerp(newPosition, lerpSpeed)
			}
			if (fixedCamera) {
				camera.lookAt(camera.position.clone().sub(offset))
			} else {
				camera.lookAt(target)
			}
		}
	}
