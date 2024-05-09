import type { Vec2 } from 'three'
import { AmbientLight, DirectionalLight, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'

export const spawnLight = ({ x, y }: Vec2, parent: Entity) => {
	x /= 2
	y /= 2
	const light = new DirectionalLight(0xFFFFFF, 0.6)
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
		light: new AmbientLight(0xFFFFFF, 2),
		position: new Vector3(),
	})
	ecs.add({
		parent,
		ambientLight: 'night',
		light: new AmbientLight(0x7F96D7, 2),
		position: new Vector3(),
	})
}