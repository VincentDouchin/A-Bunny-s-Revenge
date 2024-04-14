import { CircleGeometry, Color, MeshPhongMaterial, Vector3 } from 'three'
import { Bezier, ColorOverLife, ColorRange, ConstantValue, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife, SphereEmitter } from 'three.quarks'
import { between } from 'randomish'
import { colorToVec4 } from './honeySplatParticles'
import type { Entity } from '@/global/entity'

export const pollenBundle = () => {
	const system = new ParticleSystem({
		duration: between(20, 30),
		looping: false,
		prewarm: true,
		startColor: new ColorRange(colorToVec4(0xE8D282, 0.7), colorToVec4(0xF7F3B7, 0.7)),
		startLife: new IntervalValue(10, 20),
		startSpeed: new IntervalValue(0.2, 0.5),
		startSize: new IntervalValue(1, 2),
		startLength: new IntervalValue(5, 10),
		worldSpace: true,
		emissionOverTime: new ConstantValue(150),
		shape: new SphereEmitter({ radius: 10 }),
		renderOrder: 0,
		instancingGeometry: new CircleGeometry(1, 16),
		material: new MeshPhongMaterial({ transparent: true, shininess: 100, depthWrite: false }),
		emissionBursts: [],
		renderMode: RenderMode.BillBoard,
		behaviors: [
			new ColorOverLife(new Gradient(
				[[new Vector3(...new Color(0xF7F3B7).toArray()), 0], [new Vector3(...new Color(0xF7F3B7).toArray()), 1]],
				[[0, 0], [1, 0.5], [0, 1]],
			)),
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.75, 0.5), 0]])),
		],

	})
	system.emitter.position.y = 10

	return { emitter: system.emitter, autoDestroy: true } as const satisfies Entity
}