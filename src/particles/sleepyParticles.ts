import { MeshBasicMaterial, PlaneGeometry } from 'three'
import { Bezier, ConeEmitter, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife } from 'three.quarks'
import { assets } from '@/global/init'

const geo = new PlaneGeometry(3, 3)
const mat = new MeshBasicMaterial({ depthWrite: false, map: assets.textures.sleepy.clone(), transparent: true })

export const sleepyEmitter = () => {
	const system = new ParticleSystem({
		duration: 10,
		looping: true,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(5.0, 10.0),
		startSpeed: new ConstantValue(2),
		startRotation: new RandomQuatGenerator(),

		worldSpace: true,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(0.5),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 2 }),
		material: mat,
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	system.emitter.position.y = 10
	return system.emitter
}