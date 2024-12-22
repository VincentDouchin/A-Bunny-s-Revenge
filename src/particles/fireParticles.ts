import { CircleGeometry, Color, MeshBasicMaterial, Vector3 } from 'three'
import { Bezier, ColorOverLife, ConeEmitter, ConstantValue, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife } from 'three.quarks'

const geo = new CircleGeometry(1, 8)
const mat = new MeshBasicMaterial({ color: 0x000000, depthWrite: false })

export const fireParticles = () => {
	const system = new ParticleSystem({
		duration: 30,
		looping: true,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(2.0, 5.0),
		startSpeed: new ConstantValue(1),
		startRotation: new RandomQuatGenerator(),
		worldSpace: false,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(5),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 2 }),
		material: mat,
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
			new ColorOverLife(new Gradient(
				[[new Vector3(...new Color(0xEC273F).toArray()), 0], [new Vector3(...new Color(0xF3A833).toArray()), 1]],
				[[0.5, 0], [0, 1]],
			)),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	system.emitter.position.setZ(1)
	return system.emitter
}