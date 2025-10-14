import { CircleGeometry, MeshBasicMaterial, Vector4 } from 'three'
import { Bezier, ConeEmitter, ConstantColor, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife, SpeedOverLife } from 'three.quarks'

const geo = new CircleGeometry(3, 8)
const mat = new MeshBasicMaterial({ depthWrite: false })

export const chestAppearing = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(7, 8),
		startSpeed: new IntervalValue(5, 7),
		startSize: new IntervalValue(0.5, 1),
		startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
		worldSpace: false,
		emissionOverTime: new IntervalValue(15, 20),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 5 }),
		material: mat,
		renderOrder: 2,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.20, 0), 0]])),
			new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.8, 0.2, 0.1), 0]])),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}