import { CircleGeometry, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { Tween } from '@tweenjs/tween.js'
import { ecs, gameTweens } from '@/global/init'

const geo = new CircleGeometry(1, 8)

export const spawnFootstep = (direction: 'left' | 'right', position: Vector3, honey = false) => {
	const mat = honey
		? new MeshBasicMaterial({ opacity: 1, color: 0xE8D282, transparent: true })
		: new MeshBasicMaterial({ opacity: 0.6, color: 0x000000, transparent: true })
	const footstep = ecs.add({
		model: new Mesh(geo, mat),
		position: position.clone().add(new Vector3((direction === 'left' ? -1 : 1) * 1.3, 1, 0)),
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
	})
	gameTweens.add(new Tween(mat).to({ opacity: 0 }, 1000).onComplete(() => {
		ecs.remove(footstep)
	}))
}