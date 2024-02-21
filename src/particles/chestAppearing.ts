import { CircleGeometry, MeshBasicMaterial, Vector4 } from 'three'
import { Bezier, ColorOverLife, ConeEmitter, ConstantColor, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife } from 'three.quarks'

const geo = new CircleGeometry(3, 8)

const mat = new MeshBasicMaterial({ transparent: true })
mat.depthWrite = false
export const chestAppearing = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startLife: new IntervalValue(5, 3),
		startSpeed: new IntervalValue(4, 3),
		startSize: new IntervalValue(0.5, 1),
		startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
		worldSpace: false,
		emissionOverTime: new IntervalValue(40, 30),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 5 }),
		material: mat,
		renderMode: RenderMode.BillBoard,
		renderOrder: 2,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
			new ColorOverLife(new Gradient(
				undefined,
				[[1, 0], [0, 1]],
			)),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}