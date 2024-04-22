import type { Vector3, Vector3Tuple } from 'three'
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, ShaderMaterial, Uniform } from 'three'
import { range } from '@/utils/mapFunctions'

export const WeaponArcMaterial = () => new ShaderMaterial({
	side: DoubleSide,
	transparent: true,
	depthWrite: false,
	uniforms: {
		ratio: new Uniform(0),
	},
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
	uniform float ratio;
	varying vec2 vUv;
	void main() {
		vec2 centered_uv = vUv *2.-1.;
		
		float x = 1. - abs(centered_uv.x);
		float y = 1. - abs(centered_uv.y);
		float arc = step(0.5,x * y) * (vUv.x < ratio?1.:0.);
		gl_FragColor = vec4(vec3(arc),arc * 0.2);
	}
	`,
})

export class WeaponArc extends Mesh {
	vertices = new Float32Array()
	lastPoints: [Vector3Tuple, Vector3Tuple] | null = null
	constructor() {
		super(new BufferGeometry(), new MeshBasicMaterial({ transparent: true, side: DoubleSide, color: 0xFFFFFF, vertexColors: true, depthWrite: false }))
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
				...this.vertices.slice(0, 64 * 3),
			])
			this.setVertices()
		}
		this.lastPoints = [bottom.toArray(), top.toArray()]
	}

	setVertices() {
		const nbVertices = this.vertices.length / (6 * 3)
		const colors = range(0, nbVertices, (i) => {
			return [i, i, i + 1, i, i + 1, i + 1].flatMap(o => [1, 1, 1, 1 - o / (nbVertices * 2) - 0.2])
		}).flat()
		this.geometry.setAttribute('position', new BufferAttribute(this.vertices, 3))
		this.geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4))
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