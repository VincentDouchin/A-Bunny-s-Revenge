import { ecs, time } from '@/global/init'
import { inMap } from '@/lib/hierarchy'
import { Timer } from '@/lib/timer'
import { between } from '@/utils/mapFunctions'

export const poisonBubbles = (_looping = true, _emission = 3) => {
	// const system = new ParticleSystem({
	// 	duration: 4,
	// 	looping,
	// 	prewarm: false,
	// 	instancingGeometry: new CircleGeometry(1, 8),
	// 	startLife: new IntervalValue(5.0, 2.0),
	// 	startSpeed: new ConstantValue(0.5),
	// 	startColor: new ColorRange(colorToVec4(0x5ab552, 1), colorToVec4(0x9de64e, 1)),
	// 	startRotation: new RandomQuatGenerator(),
	// 	worldSpace: true,
	// 	emissionOverDistance: new ConstantValue(0),
	// 	emissionOverTime: new ConstantValue(emission),
	// 	shape: new CircleEmitter({ radius: 4 }),
	// 	material: new MeshBasicMaterial({ depthWrite: false }),
	// 	renderMode: RenderMode.BillBoard,
	// 	renderOrder: 1,
	// 	behaviors: [new SizeOverLife(new PiecewiseBezier([[new Bezier(0.25, 0.5, 0.75, 1), 0]]))],
	// })
	// system.emitter.position.setY(1)
	// system.emitter.rotateX(-Math.PI / 2)
	// return system.emitter
}

const trailMakerQuery = ecs.with('trailMaker', 'position')
const trailQuery = ecs.with('trail', 'position', 'model')
// const trailQuery = ecs.with('trail', 'position', 'model', 'emitter')
export const spawnPoisonTrail = () => {
	for (const trailMaker of trailMakerQuery) {
		let dist = Number.POSITIVE_INFINITY
		for (const trail of trailQuery) {
			if (trail.trail.origin === trailMaker) {
				dist = Math.min(dist, trail.position.distanceTo(trailMaker.position))
			}
		}
		if (dist > 2) {
			ecs.add(
				inMap({
					trail: {
						origin: trailMaker,
						timer: new Timer(2000, false),
						intensity: between(0.5, 2),
					},
					position: trailMaker.position.clone(),
					poison: true,
				}),
			)
		}
	}
	for (const trail of trailQuery) {
		const dist = trail.trail.origin.position.distanceTo(trail.position)
		if (dist > 10) {
			trail.trail.timer.tick(time.delta)
		}
		if (trail.trail.timer.finished()) {
			ecs.remove(trail)
		}
	}
}
