import { DoubleSide, MeshStandardMaterial, PlaneGeometry } from 'three'
import { Bezier, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife, SphereEmitter } from 'three.quarks'
import { assets } from '@/global/init'

const geo = new PlaneGeometry(10, 10)
const mat = new MeshStandardMaterial({
	map: assets.particles.star_07,
	side: DoubleSide,
	transparent: true,
})

export const ps = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startLife: new IntervalValue(2.0, 3.0),
		startSpeed: new ConstantValue(0.6),
		startRotation: new RandomQuatGenerator(),
		worldSpace: true,
		emissionOverTime: new ConstantValue(5),
		emissionBursts: [],
		shape: new SphereEmitter({ radius: 5 }),
		material: mat,
		renderMode: RenderMode.Mesh,
		renderOrder: 1,
	})
	system.addBehavior(new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.25, 0), 0]])))
	return system
}