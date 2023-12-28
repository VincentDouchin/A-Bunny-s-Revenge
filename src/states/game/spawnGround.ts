import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { getRandom } from '@/utils/mapFunctions'

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

export const grassBundle = () => ({
	scale: 10,
	model: getRandom(Object.values(assets.grass)).scene.clone(),
	inMap: true,
} as const satisfies Entity)
