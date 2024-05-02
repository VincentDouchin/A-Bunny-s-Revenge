import { CircleGeometry, MeshBasicMaterial } from 'three'
import { ColorOverLife, ColorRange, ConeEmitter, ConstantValue, Gradient, IntervalValue, ParticleSystem, RandomQuatGenerator, RenderMode } from 'three.quarks'
import { colorToVec4 } from './honeySplatParticles'

export const enemyDefeated = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: new CircleGeometry(1, 8),
		startLife: new IntervalValue(5.0, 10.0),
		startSize: new IntervalValue(1, 2),
		startSpeed: new IntervalValue(2, 5),
		startRotation: new RandomQuatGenerator(),
		startColor: new ColorRange(colorToVec4(0x5E5B8C, 0.5), colorToVec4(0xCC99FF, 0.5)),
		worldSpace: false,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(20),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 4 }),
		material: new MeshBasicMaterial({ color: 0x000000, depthWrite: false, transparent: true }),
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			// new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
			new ColorOverLife(new Gradient(
				undefined,
				[[1, 0], [0, 1]],
			)),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}