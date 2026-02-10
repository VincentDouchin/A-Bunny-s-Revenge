import type { CanvasTexture, Texture, Vec2 } from 'three'
import { MeshToonMaterial, Vector2 } from 'three'

import { GroundMaterial } from '@/shaders/materials'

const getWoodFlooring = ({ x, y }: Vec2, map: Texture) => {
	map.repeat.set(x / 16, y / 16)
	return new MeshToonMaterial({ map })
}

export const getGroundMaterial = (type: 'grass' | 'planks', args: {
	size: Vec2
	planksTexture: Texture
	groundTexture: Texture
	rockTexture: Texture
	level: CanvasTexture
}) => {
	switch (type) {
		case 'grass':{
			return new GroundMaterial().setUniforms({
				level: args.level,
				rock: null,
				size: new Vector2(args.size.x, args.size.y),
				ground: args.groundTexture,
				rock_texture: args.rockTexture,
			})
		}
		case 'planks':{
			return getWoodFlooring(args.size, args.planksTexture)
		}
	}
}