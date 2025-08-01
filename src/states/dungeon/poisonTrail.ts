import { ecs, time } from '@/global/init'
import { inMap } from '@/lib/hierarchy'
import { Timer } from '@/lib/timer'
import { colorToVec4 } from '@/particles/honeySplatParticles'
import { easeOut } from 'popmotion'
import { between } from 'randomish'
import { CircleGeometry, CylinderGeometry, Mesh, MeshBasicMaterial } from 'three'
import { Bezier, CircleEmitter, ColorRange, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RandomQuatGenerator, RenderMode, SizeOverLife } from 'three.quarks'

export const poisonBubbles = (looping = true, emission = 3) => {
	const system = new ParticleSystem({
		duration: 4,
		looping,
		prewarm: false,
		instancingGeometry: new CircleGeometry(1, 8),
		startLife: new IntervalValue(5.0, 2.0),
		startSpeed: new ConstantValue(0.5),
		startColor: new ColorRange(colorToVec4(0x5AB552, 1), colorToVec4(0x9DE64E, 1)),
		startRotation: new RandomQuatGenerator(),
		worldSpace: true,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(emission),
		shape: new CircleEmitter({ radius: 4 }),
		material: new MeshBasicMaterial({ depthWrite: false }),
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(0.25, 0.5, 0.75, 1), 0]])),
		],

	})
	system.emitter.position.setY(1)
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}

const trailMakerQuery = ecs.with('trailMaker', 'position')
const trailQuery = ecs.with('trail', 'position', 'model', 'emitter')
export const spawnPoisonTrail = () => {
	for (const trailMaker of trailMakerQuery) {
		let dist = Number.POSITIVE_INFINITY
		for (const trail of trailQuery) {
			if (trail.trail.origin === trailMaker) {
				dist = Math.min(dist, trail.position.distanceTo(trailMaker.position))
			}
		}
		if (dist === Number.POSITIVE_INFINITY || dist > 5) {
			const radius = between(3, 5)
			ecs.add({
				trail: { origin: trailMaker, timer: new Timer(4000, false) },
				model: new Mesh(new CylinderGeometry(radius, radius, 2, 16, 1), new MeshBasicMaterial({ color: 0x9DE64E, depthWrite: false })),
				position: trailMaker.position.clone(),
				...inMap(),
				emitter: poisonBubbles(),
				autoDestroy: true,
				poison: true,
			})
		}
	}
	for (const trail of trailQuery) {
		trail.trail.timer?.tick(time.delta)
		if (trail.model instanceof Mesh) {
			trail.model.material.opacity = easeOut((1 - trail.trail.timer.percent()) / 2)
		}
		if (trail.trail.timer.finished()) {
			// @ts-expect-error wrong type
			trail.emitter.system.endEmit()
		}
	}
}
