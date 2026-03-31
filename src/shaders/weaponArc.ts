import type { Vector3, Vector3Tuple } from 'three/webgpu'
import { DoubleSide } from 'three'
import { abs, mul, step, sub, uv, vec3, vec4 } from 'three/tsl'

import { BufferAttribute, BufferGeometry, Mesh, NodeMaterial } from 'three/webgpu'
import { range } from '@/utils/mapFunctions'

export const weaponArcMaterial = () => {
	const material = new NodeMaterial()
	material.side = DoubleSide
	material.transparent = true
	material.depthWrite = false

	// Fragment shader logic
	const vUv = uv()

	// vec2 centered_uv = vUv * 2. - 1.;
	const centered_uv = sub(mul(vUv, 2.0), 1.0)

	// float y = 1. - abs(centered_uv.y);
	const y = sub(1.0, abs(centered_uv.y))

	// float arc = step(0.2, vUv.x * y);
	const arc = step(0.2, mul(vUv.x, y))

	// gl_FragColor = vec4(vec3(arc), arc * vUv.x);
	material.fragmentNode = vec4(
		vec3(arc), // RGB
		mul(arc, vUv.x), // Alpha
	)
	return material
}
export class WeaponArc extends Mesh {
	vertices = new Float32Array()
	lastPoints: [Vector3Tuple, Vector3Tuple] | null = null
	constructor() {
		super(new BufferGeometry(), weaponArcMaterial())
		this.frustumCulled = false
		this.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(), 2))
		this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(), 3))
	}

	addVertices(bottom: Vector3, top: Vector3) {
		if (this.lastPoints) {
			const [lb, lt] = this.lastPoints
			this.vertices = new Float32Array([...top.toArray(), ...bottom.toArray(), ...lb, ...top.toArray(), ...lt, ...lb, ...this.vertices.slice(0, 128 * 3)])
			this.setVertices()
		}
		this.lastPoints = [bottom.toArray(), top.toArray()]
	}

	setVertices() {
		const nbVertices = this.vertices.length / (6 * 3)
		const uv = range(0, nbVertices, (i) => {
			const x1 = 1 - (i * 2) / (nbVertices * 2)
			const x2 = 1 - (i * 2 + 1) / (nbVertices * 2)
			return [
				[x1, 1],
				[x1, 0],
				[x2, 0],
				[x1, 1],
				[x2, 1],
				[x2, 0],
			].flat()
		}).flat()
		this.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
		this.geometry.setAttribute('position', new BufferAttribute(this.vertices, 3))
	}

	removeVertices() {
		this.vertices = new Float32Array()
		this.setVertices()
		this.lastPoints = null
		this.removeFromParent()
	}
}
