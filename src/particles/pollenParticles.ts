import type { ColorRepresentation } from 'three'
import type { Entity } from '@/global/entity'
import { between } from 'randomish'
import { CircleGeometry, Color, MeshPhongMaterial, Vector3 } from 'three'
import { Bezier, ColorOverLife, ColorRange, ConstantValue, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife, SphereEmitter } from 'three.quarks'
import { colorToVec4 } from './honeySplatParticles'

const geo = new CircleGeometry(1, 16)
const mat = new MeshPhongMaterial({ depthWrite: false })

export const pollenBundle = (colorStart: ColorRepresentation, colorEnd: ColorRepresentation) => {
	const system = new ParticleSystem({
		duration: between(50, 70),
		looping: false,
		prewarm: false,
		startColor: new ColorRange(colorToVec4(colorStart, 1), colorToVec4(colorEnd, 1)),
		startLife: new IntervalValue(20, 30),
		startSpeed: new IntervalValue(0.05, 0.1),
		startSize: new IntervalValue(1.5, 2),
		startLength: new IntervalValue(5, 10),
		worldSpace: true,
		emissionOverTime: new ConstantValue(20),
		shape: new SphereEmitter({ radius: 10 }),
		renderOrder: 0,
		instancingGeometry: geo,
		material: mat,
		emissionBursts: [],
		behaviors: [
			new ColorOverLife(new Gradient(
				[[new Vector3(...new Color(colorStart).toArray()), 1], [new Vector3(...new Color(colorEnd).toArray()), 1]],
				[[0, 0], [1, 0.5], [0, 1]],
			)),
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 1, 1, 0.5), 0]])),
		],

	})
	system.emitter.position.y = 10

	return { emitter: system.emitter, autoDestroy: true } as const satisfies Entity
}