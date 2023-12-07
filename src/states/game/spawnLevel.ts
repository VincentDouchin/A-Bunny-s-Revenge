import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { BoxGeometry, Color, Mesh, MeshStandardMaterial, ShaderMaterial, Vector3 } from 'three'
import { cauldronBundle } from '../farm/cooking'
import { doorBundle } from './spawnDoor'
import { getRandom, objectValues } from '@/utils/mapFunctions'
import { modelColliderBundle } from '@/lib/models'
import { assets, ecs } from '@/global/init'
import { GroundShader } from '@/shaders/GroundShader'

export const treeBundle = () => {
	const model = getRandom(objectValues(assets.trees)).scene.clone()
	model.scale.setScalar(between(1.5, 2))
	model.rotateY(between(0, Math.PI))
	return {
		inMap: true,
		parent,
		scale: 4,
		model,
	} as const
}

const SCALE = 7
export const spawnLevel = (level: levels) => () => {
	const levelImage = assets.levels[level]
	const groundMesh = new Mesh(
		new BoxGeometry(levelImage.width * SCALE, 1, levelImage.height * SCALE),
		new GroundShader(new Color(0x26854C)),
		// new MeshStandardMaterial({ color: 0x26854C }),
	)
	groundMesh.receiveShadow = true

	ecs.add({
		map: true,
		mesh: groundMesh,
		position: new Vector3(),
		...modelColliderBundle(groundMesh, RigidBodyType.Fixed),
	})
	const buffer = new OffscreenCanvas(levelImage.width, levelImage.height).getContext('2d')!
	buffer.drawImage(levelImage, 0, 0, levelImage.width, levelImage.height)
	const data = buffer.getImageData(0, 0, levelImage.width, levelImage.height).data
	 for (let x = 0; x < levelImage.width; x++) {
		for (let y = 0; y < levelImage.height; y++) {
			const i = (x * levelImage.width + y) * 4
			const color = new Color(`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`)
			const position = new Vector3(-y + levelImage.height / 2 + between(-0.5, 0.5), 0, -x + levelImage.width / 2 + between(-0.5, 0.5)).multiplyScalar(SCALE)
			switch (color.getHexString()) {
				case '4b692f': ecs.add({ ...treeBundle(), position }); break
				case 'e55ce5': ecs.add({ ...doorBundle(1, 'back'), position }); break
				case '2ee5e5': ecs.add({ ...doorBundle(1, 'left'), position }); break
				case 'e55c2e': ecs.add({ ...doorBundle(1, 'right'), position }); break
				case 'e5e52e': ecs.add({ ...doorBundle(1, 'front'), position }); break
				case '222034': ecs.add({ ...cauldronBundle(), position }); break
			}
		}
	}
}