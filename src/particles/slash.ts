import type { BufferGeometry } from 'three'
import { MeshStandardMaterial, PlaneGeometry } from 'three'
import { ConstantValue, IntervalValue, MeshSurfaceEmitter, ParticleSystem, RandomQuatGenerator, RenderMode } from 'three.quarks'

const geo = new PlaneGeometry(1, 1)
const mat = new MeshStandardMaterial({ color: 'red' })

export const impact = (geometry: BufferGeometry) => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(2.0, 4.0),
		startSpeed: new ConstantValue(0.6),
		startRotation: new RandomQuatGenerator(),
		worldSpace: true,
		emissionOverTime: new ConstantValue(2),
		emissionBursts: [],
		shape: new MeshSurfaceEmitter(geometry),
		material: mat,
		renderMode: RenderMode.Trail,
		renderOrder: 1,
	})
	return system.emitter
}