import type { World } from '@dimforge/rapier3d-compat'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three'

export class RapierDebugRenderer extends LineSegments {
	world: World

	constructor(world: World) {
		super(new BufferGeometry(), new LineBasicMaterial({ color: 0xFFFFFF, vertexColors: true }))
		this.world = world
		this.frustumCulled = false
	}

	update() {
		if (this.visible) {
			const { vertices, colors } = this.world.debugRender()
			this.geometry.setAttribute('position', new BufferAttribute(vertices, 3))
			this.geometry.setAttribute('color', new BufferAttribute(colors, 4))
		}
	}
}