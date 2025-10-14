import { CircleGeometry, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { Bezier, ColorOverLife, Gradient, IntervalValue, MeshSurfaceEmitter, ParticleSystem, PiecewiseBezier, SizeOverLife, SpeedOverLife } from 'three.quarks'

const geo = new CircleGeometry(1, 8)
const mat = new MeshBasicMaterial()

mat.depthWrite = false
export const doorClosed = () => {
	const system = new ParticleSystem({
		duration: 2,
		looping: true,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(20.0, 10.0),
		startSpeed: new IntervalValue(0.2, 0.8),
		startSize: new IntervalValue(1, 3),
		worldSpace: false,
		emissionOverTime: new IntervalValue(5, 20),
		emissionBursts: [],
		shape: new MeshSurfaceEmitter(new PlaneGeometry(50, 20)),
		material: mat,
		renderOrder: 2,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.75, 0.25), 0]])),
			new ColorOverLife(new Gradient([[new Vector3(0, 0, 0), 0], [new Vector3(0.3, 0.3, 0.3), 1]])),
			new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.8, 0.5, 0), 0]])),
		],
	})
	system.emitter.rotateX(-Math.PI)
	system.emitter.position.set(0, 10, 10)
	return system.emitter
}