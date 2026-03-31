import { ConeEmitter, ConstantColor, ConstantValue, IntervalValue, ParticleSystem, RenderMode, Vector4 } from 'three.quarks'
import { Color, DoubleSide, MeshBasicMaterial } from 'three/webgpu'

const mat = new MeshBasicMaterial({ side: DoubleSide })

export const projectileTrail = () => {
	const system = new ParticleSystem({
		duration: 5,
		looping: true,
		startLife: new IntervalValue(3.8, 4.4),
		startSpeed: new IntervalValue(-4, -5),
		startSize: new ConstantValue(1),
		startColor: new ConstantColor(new Vector4(...new Color(0x2c1e31).toArray(), 1)),
		worldSpace: true,

		emissionOverTime: new ConstantValue(5),
		emissionBursts: [],

		shape: new ConeEmitter({ radius: 1, angle: 0 }),
		material: mat,
		renderMode: RenderMode.Trail,
		rendererEmitterSettings: {
			startLength: new ConstantValue(2),
		},
		renderOrder: 0,
	})
	return system.emitter
}
