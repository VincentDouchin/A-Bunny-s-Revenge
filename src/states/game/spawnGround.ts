import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { assets, ecs } from '@/global/init'
import { between, getRandom, objectValues, range } from '@/utils/mapFunctions'

export const spawnGround = () => {
	const size = 64
	const geometry = new BoxGeometry(size, 1, size)
	const material = new MeshStandardMaterial({ color: 0x239063 })
	const mesh = new Mesh(geometry, material)
	mesh.receiveShadow = true

	ecs.add({
		 mesh,
		 position: new Vector3(),
		 bodyDesc: RigidBodyDesc.fixed().setCcdEnabled(true),
		 colliderDesc: ColliderDesc.cuboid(size / 2, 0.5, size / 2),
	})
}
export const spawnSkyBox = () => {
	const size = 512
	const skybox = new Mesh(
		new BoxGeometry(size, size, size),
		assets.skybox.map(t => new MeshBasicMaterial({ map: t, side: BackSide })),
	)
	ecs.add({
		mesh: skybox,
		position: new Vector3(0, -64, 0),
	})
}
export const spawnTrees = () => {
	range(0, 20, (_) => {
		ecs.add({
			model: getRandom(objectValues(assets.trees).map(glb => glb.scene)).clone(),
			position: new Vector3(between(-32, 32), 0, between(-32, 32)),
		})
	})
}