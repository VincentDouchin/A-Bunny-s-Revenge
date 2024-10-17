import { assets } from '@/global/init'
import { MeshBasicMaterial, PlaneGeometry } from 'three'
import { Bezier, ColorRange, ConeEmitter, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife } from 'three.quarks'
import { colorToVec4 } from './honeySplatParticles'

export const heartEmitter = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: new PlaneGeometry(3, 3),
		startLife: new IntervalValue(5.0, 10.0),
		startSpeed: new ConstantValue(2),
		startRotation: new RandomQuatGenerator(),
		startColor: new ColorRange(colorToVec4(0xFA6E79), colorToVec4(0xEC273F)),
		worldSpace: true,
		emissionOverDistance: new ConstantValue(1),
		emissionOverTime: new ConstantValue(1.3),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 3, angle: Math.PI / 2 }),
		material: new MeshBasicMaterial({ depthWrite: false, map: assets.textures.heart.clone(), transparent: true }),
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	system.emitter.position.y = 5
	return system.emitter
}