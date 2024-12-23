import { ecs, tweens } from '@/global/init'
import { CircleGeometry, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three'

const geo = new CircleGeometry(1, 8)

export const spawnFootstep = (direction: 'left' | 'right', position: Vector3, honey = false) => {
	const footstepMat = new MeshBasicMaterial({ opacity: 0.6, color: 0x000000, transparent: true })
	const footstepHoney = new MeshBasicMaterial({ opacity: 1, color: 0xE8D282, transparent: true })
	const mat = honey
		? footstepHoney
		: footstepMat
	const footstep = ecs.add({
		model: new Mesh(geo, mat),
		position: position.clone().add(new Vector3((direction === 'left' ? -1 : 1) * 1.3, 1, 0)),
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
	})
	tweens.add({
		from: mat.opacity,
		to: 0,
		duration: 1000,
		onUpdate: o => mat.opacity = o,
		destroy: footstep,
	})
}