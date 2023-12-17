import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { insideCircle } from 'randomish'
import { assets, ecs } from '@/global/init'
import { between, getRandom, objectValues, range } from '@/utils/mapFunctions'

export const spawnGround = (size = 256) => () => {
	const geometry = new BoxGeometry(size, 1, size)
	const material = new MeshStandardMaterial({ color: 0x4E6E49 })
	const mesh = new Mesh(geometry, material)
	mesh.receiveShadow = true

	ecs.add({
		map: true,
		mesh,
		 position: new Vector3(),
		 bodyDesc: RigidBodyDesc.fixed().setCcdEnabled(true),
		 colliderDesc: ColliderDesc.cuboid(size / 2, 0.5, size / 2),
	})
}
export const spawnSkyBox = () => {
	const size = 1024
	const skybox = new Mesh(
		new BoxGeometry(size, size, size),
		assets.skybox.map(t => new MeshBasicMaterial({ map: t, side: BackSide })),
	)
	ecs.add({
		inMap: true,
		mesh: skybox,
		position: new Vector3(0, -64, 0),
	})
}
export const spawnTrees = (size = 256, amount = 100) => () => {
	range(0, amount, () => {
		const model = getRandom(objectValues(assets.trees)).scene.clone()
		model.scale.setScalar(between(2, 2.5))
		const position = insideCircle(size / 2)
		ecs.add({
			inMap: true,
			parent,
			scale: 4,
			model,
			position: new Vector3(position.x + Math.sign(position.x) * size / 16, 0, position.y + Math.sign(position.y) * size / 16),
			outline: true,
		})
	})
}
export const spawnRocks = (size = 256, amount = 100) => () => {
	range(0, amount, () => {
		ecs.add({
			inMap: true,
			scale: 4,
			model: getRandom(objectValues(assets.rocks).map(glb => glb.scene)).clone(),
			position: new Vector3(between(-size / 2, size / 2), 0, between(-size / 2, size / 2)),
			outline: true,
		})
	})
}