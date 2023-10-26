import { CameraHelper, DirectionalLight, Vector3 } from 'three'
import { ecs } from '@/global/init'
import { camera } from '@/global/camera'
import { scene } from '@/global/rendering'

export const spawnLight = () => {
	const light = new DirectionalLight(0xFFFFFF, 1)
	light.lookAt(new Vector3(0, 0, 0))
	light.castShadow = true
	scene.add(new CameraHelper(light.shadow.camera))
	ecs.add({ light, position: new Vector3(10, 10, 0) })
}