import type { Vector3, Vector3Tuple } from 'three'
import { range } from '@/utils/mapFunctions'
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, ShaderMaterial } from 'three'

export const weaponArcMaterial = new ShaderMaterial({
	side: DoubleSide,
	transparent: true,
	depthWrite: false,
	vertexShader: /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
		gl_Position = projectionMatrix * modelViewPosition;
	}
	`,
	fragmentShader: /* glsl */`
	uniform sampler2D tDiffuse;
	varying vec2 vUv;
	void main() {
		vec2 centered_uv = vUv *2.-1.;
		
		float y = 1. - abs(centered_uv.y);
		float arc = step(0.2,vUv.x * y) ;
		gl_FragColor = vec4(vec3(arc),arc * vUv.x);
	}
	`,
})

export class WeaponArc extends Mesh {
	vertices = new Float32Array()
	lastPoints: [Vector3Tuple, Vector3Tuple] | null = null
	constructor() {
		super(new BufferGeometry(), weaponArcMaterial)
		this.frustumCulled = false
	}

	addVertices(bottom: Vector3, top: Vector3) {
		if (this.lastPoints) {
			const [lb, lt] = this.lastPoints
			this.vertices = new Float32Array([
				...top.toArray(),
				...bottom.toArray(),
				...lb,
				...top.toArray(),
				...lt,
				...lb,
				...this.vertices.slice(0, 128 * 3),
			])
			this.setVertices()
		}
		this.lastPoints = [bottom.toArray(), top.toArray()]
	}

	setVertices() {
		const nbVertices = this.vertices.length / (6 * 3)
		const uv = range(0, nbVertices, (i) => {
			const x1 = 1 - (i * 2) / (nbVertices * 2)
			const x2 = 1 - (i * 2 + 1) / (nbVertices * 2)
			return [[x1, 1], [x1, 0], [x2, 0], [x1, 1], [x2, 1], [x2, 0]].flat()
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

	reset() {
		this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(), 3))
	}
}