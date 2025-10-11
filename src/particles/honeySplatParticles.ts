import type { ColorRepresentation } from 'three'
import type { Entity } from '@/global/entity'
import { CircleGeometry, Color, MeshPhongMaterial, SphereGeometry, Vector3, Vector4 } from 'three'
import { ApplyForce, Bezier, CircleEmitter, ColorOverLife, ColorRange, ConstantValue, Gradient, GridEmitter, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife } from 'three.quarks'

const geo = new CircleGeometry(1, 16)
export const colorToVec4 = (color: ColorRepresentation, opacity = 1) => {
	return new Vector4(...new Color(color).toArray(), opacity)
}
const mat = new MeshPhongMaterial({ transparent: true, shininess: 100, depthWrite: false })

export const honeySplatParticlesBundle = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startColor: new ColorRange(colorToVec4(0xE8D282, 0.7), colorToVec4(0xF7F3B7, 0.7)),
		startLife: new IntervalValue(20, 30),
		startSpeed: new ConstantValue(0),
		startSize: new IntervalValue(3, 7),
		worldSpace: true,
		emissionOverTime: new ConstantValue(5),
		shape: new GridEmitter({ width: 20, height: 20, row: 10, column: 10 }),
		renderOrder: 0,
		material: mat,
		emissionBursts: [],
		renderMode: RenderMode.HorizontalBillBoard,
		behaviors: [
			new ColorOverLife(new Gradient(
				undefined,
				[[0.7, 0], [0, 1]],
			)),
		],

	})
	system.emitter.rotateX(-Math.PI / 2)

	return { emitter: system.emitter, autoDestroy: true } as const satisfies Entity
}

export const honeyDrippingParticles = () => {
	const system = new ParticleSystem({
		duration: 10,
		looping: false,
		prewarm: false,
		instancingGeometry: new SphereGeometry(1),
		startColor: new ColorRange(colorToVec4(0xE8D282, 0.7), colorToVec4(0xF7F3B7, 0.7)),
		startLife: new IntervalValue(4, 5),
		startSpeed: new IntervalValue(0.1, 0.2),
		startSize: new IntervalValue(1, 1.5),
		worldSpace: true,
		emissionOverTime: new ConstantValue(10),
		shape: new CircleEmitter({ radius: 2 }),
		material: mat,
		emissionBursts: [],
		renderMode: RenderMode.Mesh,
		behaviors: [
			new ApplyForce(new Vector3(0, -1, 0), new IntervalValue(1, 2)),
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
		],
	})
	system.emitter.rotateX(Math.PI / 2)
	return system.emitter
}