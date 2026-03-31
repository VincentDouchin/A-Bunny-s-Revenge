import type { World } from '@dimforge/rapier3d-compat'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three/webgpu'

export class RapierDebugRenderer extends LineSegments {
	world: World

	constructor(world: World) {
		super(new BufferGeometry(), new LineBasicMaterial({ color: 0xffffff, vertexColors: true }))
		this.world = world
		this.frustumCulled = false
		this.visible = false
	}

	update() {
		const { vertices, colors } = this.world.debugRender()
		if (vertices.length !== 0) {
			this.visible = true
			this.geometry.setAttribute('position', new BufferAttribute(vertices, 3))
			this.geometry.setAttribute('color', new BufferAttribute(colors, 4))
		} else {
			this.visible = false
		}
	}
}
