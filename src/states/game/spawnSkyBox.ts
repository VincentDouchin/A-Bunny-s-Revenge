import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { assets, ecs } from '@/global/init'

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
