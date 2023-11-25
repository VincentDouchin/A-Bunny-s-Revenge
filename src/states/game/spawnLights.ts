import { AmbientLight, DirectionalLight, Vector3 } from 'three'
import { ecs } from '@/global/init'

export const spawnLight = () => {
	const light = new DirectionalLight(0xFFFFFF, 0.5)
	light.lookAt(new Vector3(0, 0, 0))
	const size = 1024
	light.shadow.mapSize.set(size * 8, size * 8)

	light.castShadow = true
	light.shadow.camera.top = size
	light.shadow.camera.bottom = -size
	light.shadow.camera.left = -size
	light.shadow.camera.right = size
	light.shadow.bias = 0.002
	ecs.add({ light, position: new Vector3(0, 50, 0) })
	ecs.add({ light: new AmbientLight(0xFFFFFF, 1), position: new Vector3() })
}