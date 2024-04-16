import { CircleGeometry, MeshBasicMaterial, Vector3, Vector4 } from 'three'
import { ColorOverLife, ConstantColor, ConstantValue, Gradient, ParticleSystem, PointEmitter, RenderMode } from 'three.quarks'
import { colorToVec4 } from './honeySplatParticles'
import type { Entity } from '@/global/entity'

const geo = new CircleGeometry(1, 8)

const mat = new MeshBasicMaterial({ transparent: true })
mat.depthWrite = false
export const footstepsBundle = (direction: 'left' | 'right', honey = false) => {
	const startOpacity = honey ? 1 : 0.6
	const system = new ParticleSystem({
		duration: 1,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startColor: new ConstantColor(honey ? colorToVec4(0xE8D282) : new Vector4(0, 0, 0, startOpacity)),
		startLife: new ConstantValue(8.0),
		startSpeed: new ConstantValue(0),
		startSize: new ConstantValue(0.8),
		worldSpace: true,
		emissionOverTime: new ConstantValue(1),
		shape: new PointEmitter(),
		material: mat,
		emissionBursts: [],
		renderMode: RenderMode.HorizontalBillBoard,
		behaviors: [
			new ColorOverLife(new Gradient(undefined, [[startOpacity, 0], [0, 1]])),
		],

	})
	system.emitter.position.x = (direction === 'left' ? -1 : 1) * 1.3
	system.emitter.position.y = 1
	return { emitter: system.emitter, autoDestroy: true, position: new Vector3() } as const satisfies Entity
}