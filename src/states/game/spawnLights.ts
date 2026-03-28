import type { Vector2Like } from 'three/webgpu'
import type { Entity } from '@/global/entity'
import { AmbientLight, DirectionalLight, Vector3 } from 'three/webgpu'
import { ecs } from '@/global/init'

export const spawnLight = ({ x, y }: Vector2Like, parent: Entity) => {
	const light = new DirectionalLight(0xFFFFFF, 0.4)
	light.lookAt(new Vector3(0, 0, 0))
	light.shadow.mapSize.set(x * 2, y * 2)
	light.castShadow = true
	light.shadow.camera.top = y / 2
	light.shadow.camera.bottom = -y / 2
	light.shadow.camera.left = -x / 2
	light.shadow.camera.right = x / 2
	light.shadow.bias = 0.002
	ecs.add({
		parent,
		light,
		position: new Vector3(0, 50, 0),
	})
	ecs.add({
		parent,
		ambientLight: 'day',
		light: new AmbientLight(0xFFFFFF, 0.05),
		position: new Vector3(),
	})
	ecs.add({
		parent,
		ambientLight: 'night',
		light: new AmbientLight(0x7F96D7, 0.05),
		position: new Vector3(),
	})
}