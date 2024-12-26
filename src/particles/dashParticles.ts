import { CircleGeometry, MeshBasicMaterial, Vector4 } from 'three'
import { Bezier, ColorRange, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode, SizeOverLife } from 'three.quarks'

const geo = new CircleGeometry(1, 8)
const mat = new MeshBasicMaterial({ transparent: true })
mat.depthWrite = false

export const dash = (duration: number) => {
	const system = new ParticleSystem({
		duration,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startColor: new ColorRange(new Vector4(1, 1, 1, 0.2), new Vector4(0.7, 0.7, 0.7, 0.5)),
		startLife: new ConstantValue(5.0),
		startSpeed: new ConstantValue(-1),
		startSize: new IntervalValue(1, 3),
		worldSpace: true,
		emissionOverTime: new ConstantValue(20),
		shape: new PointEmitter(),
		material: mat,
		renderMode: RenderMode.BillBoard,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
		],

	})
	system.pause()
	system.emitter.position.y = 0.5
	return system
}