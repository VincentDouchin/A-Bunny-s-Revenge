import { CircleGeometry, MeshBasicMaterial } from 'three'
import { ColorRange, ConeEmitter, ConstantValue, IntervalValue, ParticleSystem, RandomQuatGenerator, RenderMode } from 'three.quarks'
import { colorToVec4 } from './honeySplatParticles'

export const fishParticles = () => {
	const system = new ParticleSystem({
		duration: 1,
		looping: false,
		prewarm: true,
		instancingGeometry: new CircleGeometry(1, 8),
		startLife: new IntervalValue(0.5, 1.0),
		startSpeed: new ConstantValue(5),
		startSize: new ConstantValue(0.4),
		startRotation: new RandomQuatGenerator(),
		startColor: new ColorRange(colorToVec4(0x36C5F4), colorToVec4(0x3388DE)),
		worldSpace: false,
		emissionOverTime: new ConstantValue(20),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 1 }),
		material: new MeshBasicMaterial({ color: 0x000000, depthWrite: false }),
		renderMode: RenderMode.BillBoard,

	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}