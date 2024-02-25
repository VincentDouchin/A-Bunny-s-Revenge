import type { Mesh } from 'three'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Uniform, Vector3 } from 'three'
import { ecs, time } from '@/global/init'
import { height, width } from '@/global/rendering'
import type { State } from '@/lib/state'

const FIREFLIES_POSITIONS = [
	[-0.7, 2.3, -3.8],

]

const FIREFLIES_PER_LAMP = 20
const TOTAL_FIREFLIES_COUNT = FIREFLIES_POSITIONS.length * FIREFLIES_PER_LAMP

const POSITIONS_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT * 3)
const SCALES_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT)

let currrentLampCount = 1
for (let i = 0; i < TOTAL_FIREFLIES_COUNT; i++) {
	if (i > (TOTAL_FIREFLIES_COUNT / FIREFLIES_POSITIONS.length) * currrentLampCount) {
		currrentLampCount++
	}

	POSITIONS_ARRAY[i * 3 + 0] = (Math.random() - 0.5) * 12 + FIREFLIES_POSITIONS[currrentLampCount - 1][0]
	POSITIONS_ARRAY[i * 3 + 1] = (Math.random() - 0.5) * 6 + FIREFLIES_POSITIONS[currrentLampCount - 1][1]
	POSITIONS_ARRAY[i * 3 + 2] = (Math.random() - 0.5) * 12 + FIREFLIES_POSITIONS[currrentLampCount - 1][2]
	SCALES_ARRAY[i] = Math.random() * 0.5 + 0.5
}

const firefliesMaterial = new ShaderMaterial({
	uniforms: {
		uPixelRatio: new Uniform(width / height),
		uSize: new Uniform(300),
		uTime: new Uniform(0),
		uVelocity: new Uniform(0.17),
		uColor: new Uniform(new Color(0xFF0000)),
		uIntensity: new Uniform(8),
	},
	transparent: true,
	blending: AdditiveBlending,
	depthWrite: false,
	vertexShader: /* glsl */`
	uniform float uPixelRatio;
	uniform float uSize;
	uniform float uTime;
	uniform float uVelocity;

	attribute float aScale;
	varying float vScale;

	void main() {
		vec4 modelPosition = modelMatrix * vec4(position, 1.0);
		modelPosition.x += sin(modelPosition.y + uTime + (aScale * 150.0)) * uVelocity;
		modelPosition.y += sin(modelPosition.x + uTime + (aScale * 150.0)) * uVelocity + 1.0;

		vec4 viewPosition = viewMatrix * modelPosition;
		vec4 projectionPosition = projectionMatrix * viewPosition;

		gl_Position = projectionPosition;
		gl_PointSize = uSize * aScale * uPixelRatio;
		gl_PointSize *= (1.0 / -viewPosition.z);

		vScale = aScale;
	}`,
	fragmentShader: /* glsl */`
	uniform vec3 uColor;
	uniform float uIntensity;

	varying float vScale;

	void main() {
		float distanceToCenter = distance(gl_PointCoord, vec2(0.5));

		if(distanceToCenter > 0.475) {
			gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
			return;
		}
		float strengh = 0.05 / distanceToCenter - 0.1;
		strengh = clamp(strengh, 0.0, 1.0);
		gl_FragColor = vec4(uColor, strengh) * uIntensity * vScale;
	}`,

})

const fireflies = () => {
	const bufferGeometry = new BufferGeometry()

	// Set up positions attribute
	const positionsAttribute = new BufferAttribute(POSITIONS_ARRAY, 3)
	bufferGeometry.setAttribute('position', positionsAttribute)

	// Set up aScale attribute
	const aScaleAttribute = new BufferAttribute(SCALES_ARRAY, 1)
	bufferGeometry.setAttribute('aScale', aScaleAttribute)

	// Create Points object and add it to the scene
	const points = new Points(bufferGeometry, firefliesMaterial)
	return points
}
const spawnFirefly = () => {
	ecs.add({ model: fireflies(), firefly: true, position: new Vector3() })
}

const firefliesQuery = ecs.with('model', 'firefly')
const updateFireflies = () => {
	for (const firefly of firefliesQuery) {
		(firefly.model as Mesh<any, ShaderMaterial>).material.uniforms.uTime.value = time.elapsed / 1000
	}
}
export const firefliesPlugin = (state: State<any>) => {
	state.onEnter(spawnFirefly)
		.onUpdate(updateFireflies)
}