import { Color, DoubleSide, MeshBasicMaterial, Vector4 } from 'three'
import { ConeEmitter, ConstantColor, ConstantValue, IntervalValue, ParticleSystem, RenderMode } from 'three.quarks'

export const projectileTrail = () => {
	const system = new ParticleSystem({
		duration: 5,
		looping: true,
		startLife: new IntervalValue(3.8, 4.4),
		startSpeed: new IntervalValue(-4, -5),
		startSize: new ConstantValue(1),
		startColor: new ConstantColor(new Vector4(...new Color(0x2C1E31).toArray(), 1)),
		worldSpace: true,

		emissionOverTime: new ConstantValue(5),
		emissionBursts: [

		],

		shape: new ConeEmitter({ radius: 1, angle: 0 }),
		material: new MeshBasicMaterial({
			// blending: AdditiveBlending,
			side: DoubleSide,
		}),
		renderMode: RenderMode.Trail,
		rendererEmitterSettings: {
			startLength: new ConstantValue(2),
		},
		renderOrder: 0,
	})
	return system.emitter
}