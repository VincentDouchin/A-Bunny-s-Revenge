import { Color, DoubleSide, MeshStandardMaterial, PlaneGeometry, Vector4 } from 'three'
import { Bezier, ColorRange, ConeEmitter, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife } from 'three.quarks'
import { assets } from '@/global/init'

const geo = new PlaneGeometry(2, 2)
const mat = new MeshStandardMaterial({
	map: assets.particles.star_07,
	side: DoubleSide,
	transparent: true,
})

export const cauldronSparkles = (amount: number) => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(5.0, 10.0),
		startSpeed: new ConstantValue(2),
		startColor: new ColorRange(
			new Vector4(...new Color(0xDE5D3A).toArray(), 1),
			new Vector4(...new Color(0xF3A833).toArray(), 1),
		),
		worldSpace: true,
		emissionOverTime: new ConstantValue(amount / 10),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 1 }),
		material: mat,
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.50, 0.25, 0), 0]])),
		],
	})
	system.emitter.position.set(0, 10, 0)
	system.emitter.rotateX(-Math.PI / 2)

	return system.emitter
}