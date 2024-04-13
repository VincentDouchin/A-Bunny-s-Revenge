import { DoubleSide, MeshStandardMaterial, PlaneGeometry } from 'three'
import { Bezier, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife, SphereEmitter } from 'three.quarks'
import { assets } from '@/global/init'

const geo = new PlaneGeometry(10, 10)
const mat = new MeshStandardMaterial({
	map: assets.particles.star_07,
	side: DoubleSide,
	transparent: true,
})

export const impact = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startLife: new IntervalValue(2.0, 4.0),
		startSpeed: new ConstantValue(0.6),
		startRotation: new RandomQuatGenerator(),
		worldSpace: true,
		emissionOverTime: new ConstantValue(2),
		emissionBursts: [],
		shape: new SphereEmitter({ radius: 10 }),
		material: mat,
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.50, 0.25, 0), 0]])),
		],
	})
	system.emitter.position.y = 5
	return system.emitter
}