import type { CanvasTexture, Texture, Vector2Like } from 'three/webgpu'
import { Vector2 } from 'three/webgpu'
import { GroundMaterial } from '@/shaders/groundMaterial'
import { ToonMaterial } from '@/shaders/toonMaterial'

const getWoodFlooring = ({ x, y }: Vector2Like, map: Texture) => {
	map.repeat.set(x / 16, y / 16)
	return new ToonMaterial({ map })
}

export const getGroundMaterial = (
	type: 'grass' | 'planks',
	args: {
		size: Vector2Like
		planksTexture: Texture
		groundTexture: Texture
		rockTexture: Texture
		level: CanvasTexture | null
		grassNoiseTexture: CanvasTexture | null
	},
) => {
	switch (type) {
		case 'grass': {
			if (!args.grassNoiseTexture) {
				throw new Error('no grass noise texture')
			}
			return new GroundMaterial({
				levelSize: new Vector2(args.size.x, args.size.y),
				groundTexture: args.groundTexture,
				rockTexture: args.rockTexture,
				level: args.level,
				grassNoiseTexture: args.grassNoiseTexture,
			})
		}
		case 'planks': {
			return getWoodFlooring(args.size, args.planksTexture)
		}
	}
}
