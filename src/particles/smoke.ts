import { CircleGeometry, MeshBasicMaterial, Vector3 } from 'three'
import { Bezier, ColorOverLife, ConeEmitter, ConstantValue, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife } from 'three.quarks'

export const smoke = () => {
	const system = new ParticleSystem({
		duration: 30,
		looping: true,
		prewarm: true,
		instancingGeometry: new CircleGeometry(1, 8),
		startLife: new IntervalValue(20.0, 10.0),
		startSpeed: new ConstantValue(0.5),
		startRotation: new RandomQuatGenerator(),
		worldSpace: false,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(2),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 2 }),
		material: new MeshBasicMaterial({ color: 0x000000, depthWrite: false }),
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
			new ColorOverLife(new Gradient(
				[[new Vector3(0, 0, 0), 0], [new Vector3(0.3, 0.3, 0.3), 1]],
				[[1, 0], [0, 1]],
			)),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}