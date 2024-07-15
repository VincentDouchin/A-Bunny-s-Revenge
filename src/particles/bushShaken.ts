import { DoubleSide, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { AxisAngleGenerator, Bezier, ConstantValue, ForceOverLife, HemisphereEmitter, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, Rotation3DOverLife, SizeOverLife } from 'three.quarks'
import { assets } from '@/global/init'

export const shakenLeaves = () => {
	const geo = new PlaneGeometry(3, 6)
	const mat = new MeshStandardMaterial({
		map: assets.textures.plant_19,
		side: DoubleSide,
		transparent: true,
		depthWrite: true,
	})
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startLife: new IntervalValue(5.0, 10.0),
		startSpeed: new ConstantValue(5),
		startRotation: new RandomQuatGenerator(),
		emissionOverTime: new ConstantValue(30),
		emissionBursts: [],
		shape: new HemisphereEmitter({ radius: 5 }),
		material: mat,
		renderMode: RenderMode.Mesh,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 1, 0.50, 0.50), 0]])),
			new Rotation3DOverLife(
				new AxisAngleGenerator(new Vector3(0, 0.5, 0.2).normalize(), new ConstantValue(1)),
				false,
			),
			new ForceOverLife(new ConstantValue(0), new ConstantValue(0), new ConstantValue(-5)),
		],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}