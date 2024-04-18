import type { World } from '@dimforge/rapier3d-compat'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three'

export class RapierDebugRenderer {
	mesh
	world: World
	enabled = true

	constructor(world: World) {
		this.world = world
		this.mesh = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: 0xFFFFFF, vertexColors: true }))
		this.mesh.frustumCulled = false
	}

	update() {
		if (this.enabled) {
			const { vertices, colors } = this.world.debugRender()
			this.mesh.geometry.setAttribute('position', new BufferAttribute(vertices, 3))
			this.mesh.geometry.setAttribute('color', new BufferAttribute(colors, 4))
			this.mesh.visible = true
		} else {
			this.mesh.visible = false
		}
	}
}