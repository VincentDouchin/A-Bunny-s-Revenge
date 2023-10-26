import { BoxGeometry, Mesh, MeshPhongMaterial, PerspectiveCamera, Vector3 } from 'three'
import CSM from 'three-csm'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ecs } from './init'
import { rendererQuery, scene, sceneQuery } from './rendering'

export const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

export const initCamera = (debug: boolean = false) => () => {
	if (debug) {
		camera.position.set(0, 5, -5)
		const [scene] = sceneQuery
		scene.scene.add(camera)
		ecs.add({ camera, mainCamera: true })
		const [renderer] = rendererQuery
		const controls = new OrbitControls(camera, renderer.renderer.domElement)
		ecs.add({ controls })
	} else {
		ecs.add({ camera, position: new Vector3(), mainCamera: true })
	}
}
const cameraQuery = ecs.with('camera', 'position', 'mainCamera')
const cameraTargetQuery = ecs.with('cameratarget', 'worldPosition')
const lightsQuery = ecs.with('light')
export const moveCamera = () => {
	for (const { position, camera } of cameraQuery) {
		for (const { worldPosition } of cameraTargetQuery) {
			position.x = worldPosition.x
			position.y = worldPosition.y + 5
			position.z = worldPosition.z - 5
			camera.lookAt(worldPosition)
			for (const { light } of lightsQuery) {
				light.shadow.camera.lookAt(worldPosition)
			}
		}
		for (const { light } of lightsQuery) {
			light.shadow.camera.position.x = position.x
			light.shadow.camera.position.y = position.y
			light.shadow.camera.left = position.x - 5
			light.shadow.camera.right = position.x + 5
			light.shadow.camera.bottom = position.y - 5
			light.shadow.camera.top = position.y + 5
			light.shadow.updateMatrices(light)
			light.shadow.camera.updateProjectionMatrix()
			light.shadow.camera.updateMatrix()
			light.shadow.camera.updateMatrixWorld()
		}
	}
}

// export const initializedCSM = () => ecs.with('camera', 'mainCamera').onEntityAdded.subscribe((entity) => {
// 	const csm = new CSM({
// 		maxFar: entity.camera.far,
// 		cascades: 4,
// 		shadowMapSize: 1024,
// 		lightDirection: new Vector3(0, 1, 0).normalize(),
// 		camera: entity.camera,
// 		parent: scene,
// 		mode: 'practical',
// 		shadowBias: 0,
// 	})
// 	// csm.update()
// 	// ecs.addComponent(entity, 'csm', csm)
// })
// const csmQuery = ecs.with('csm', 'camera')
// export const setupCSMForMaterials = () => ecs.with('mesh').onEntityAdded.subscribe((entity) => {
// 	for (const { csm } of csmQuery) {
// 		// console.log('ok', entity)
// 		// csm.setupMaterial(entity.mesh.material)
// 	}
// })
// export const updateCSM = () => {
// 	for (const { csm } of csmQuery) {
// 		csm.update()
// 	}
// }