import { CircleGeometry, MeshBasicMaterial, Vector4 } from 'three'
import { Bezier, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RandomColor, SizeOverLife } from 'three.quarks'

const geo = new CircleGeometry(1, 8)
const mat = new MeshBasicMaterial({ depthWrite: false })

export const dash = (duration: number) => {
	const system = new ParticleSystem({
		duration,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startColor: new RandomColor(new Vector4(1, 1, 1, 0.2), new Vector4(0.7, 0.7, 0.7, 0.5)),
		startLife: new ConstantValue(3.0),
		startSpeed: new ConstantValue(-1),
		startSize: new IntervalValue(0.5, 1.5),
		worldSpace: true,
		emissionOverTime: new ConstantValue(8),
		shape: new PointEmitter(),
		material: mat,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.90, 0.80, 0.10), 0]])),
		],

	})
	system.pause()
	system.emitter.position.y = 0.5
	return system
}