import { CircleGeometry, MeshBasicMaterial, Vector3, Vector4 } from 'three'
import { Bezier, ConstantColor, ConstantValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode, SizeOverLife } from 'three.quarks'
import type { Entity } from '@/global/entity'

const geo = new CircleGeometry(1, 8)

const mat = new MeshBasicMaterial({ transparent: true })
mat.depthWrite = false
export const footstepsBundle = (direction: 'left' | 'right') => {
	const system = new ParticleSystem({
		duration: 1,
		looping: false,
		prewarm: true,
		instancingGeometry: geo,
		startColor: new ConstantColor(new Vector4(0, 0, 0, 0.2)),
		startLife: new ConstantValue(5.0),
		startSpeed: new ConstantValue(0),
		startSize: new ConstantValue(1),
		worldSpace: true,
		emissionOverTime: new ConstantValue(1),
		shape: new PointEmitter(),
		material: mat,
		renderMode: RenderMode.HorizontalBillBoard,
		behaviors: [
			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.50, 0.25), 0]])),
		],

	})
	system.emitter.position.x = (direction === 'left' ? -1 : 1) * 1.5
	system.emitter.position.y = 0.5
	return { emitter: system.emitter, autoDestroy: true, position: new Vector3() } as const satisfies Entity
}