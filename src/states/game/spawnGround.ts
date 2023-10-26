import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { ecs } from '@/global/init'

export const spawnGround = () => {
	const size = 64
	const geometry = new BoxGeometry(size, 1, size)
	const material = new MeshStandardMaterial({ color: 0x239063 })
	const mesh = new Mesh(geometry, material)
	mesh.receiveShadow = true
	mesh.castShadow = true

	ecs.add({
		 mesh,
		 position: new Vector3(),
		 bodyDesc: RigidBodyDesc.fixed().setCcdEnabled(true),
		 colliderDesc: ColliderDesc.cuboid(size / 2, 0.5, size / 2),
	})
	const box = new Mesh(new BoxGeometry(1, 1), new MeshStandardMaterial({ color: 0xFF0000 }))
	box.castShadow = true
	box.receiveShadow = true
	// ecs.add({
	// 	mesh: box,
	// 	position: new Vector3(1, 1, 0),
	// })
}