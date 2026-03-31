import type { CustomVFXParticlesOptions } from '@/lib/particles'
import { Bezier, ConeEmitter, ConstantColor, IntervalValue, ParticleSystem, PiecewiseBezier, SizeOverLife, SpeedOverLife, Vector4 } from 'three.quarks'
import { CircleGeometry, MeshBasicMaterial } from 'three/webgpu'
import { Blending, EmitterShape } from 'vanilla-vfx'

const geo = new CircleGeometry(3, 8)
const mat = new MeshBasicMaterial({ depthWrite: false })

export const chestAppearing = () => {
	const system = new ParticleSystem({
		duration: 3,
		looping: false,
		prewarm: false,
		instancingGeometry: geo,
		startLife: new IntervalValue(7, 8),
		startSpeed: new IntervalValue(5, 7),
		startSize: new IntervalValue(0.5, 1),
		startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
		worldSpace: false,
		emissionOverTime: new IntervalValue(15, 20),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 5 }),
		material: mat,
		renderOrder: 2,
		behaviors: [new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.75, 0.2, 0), 0]])), new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.8, 0.2, 0.1), 0]]))],
	})
	system.emitter.rotateX(-Math.PI / 2)
	return system.emitter
}

export const chestAppearingParticles: CustomVFXParticlesOptions = {
	// debug: true,
	// Basic settings
	maxParticles: 200, // Calculated: ~17.5 particles/sec * 8 sec lifetime
	autoStart: true,
	delay: 0.055, // ~18 particles per second (1/18)
	emitCount: 1,

	// Particle properties
	lifetime: [7, 8], // startLife
	speed: [5, 7], // startSpeed
	size: [0.5, 1], // startSize
	colorStart: ['#ffffff'], // startColor (white)

	// Emitter shape - Cone
	emitterShape: EmitterShape.CONE,
	emitterRadius: [0, 5], // ConeEmitter radius
	emitterAngle: Math.PI / 4, // Default cone angle (adjust as needed)
	emitterDirection: [0, 0, 1], // Points forward (accounts for rotateX(-PI/2))

	// Geometry mode
	geometry: geo, // Your custom geometry (instancingGeometry)

	// Curves - Size over life: Bezier(1, 0.75, 0.20, 0)
	fadeSizeCurve: {
		points: [
			{ pos: [0, 1], handleOut: [0.15, -0.08] },
			{ pos: [0.5, 0.47], handleIn: [-0.15, 0.13], handleOut: [0.15, -0.13] },
			{ pos: [1, 0], handleIn: [-0.2, 0.07] },
		],
	},

	// Curves - Speed over life: Bezier(1, 0.8, 0.2, 0.1)
	velocityCurve: {
		points: [
			{ pos: [0, 1], handleOut: [0.15, -0.07] },
			{ pos: [0.5, 0.5], handleIn: [-0.15, 0.15], handleOut: [0.15, -0.2] },
			{ pos: [1, 0.1], handleIn: [-0.2, 0.05] },
		],
	},

	// Other settings
	blending: Blending.NORMAL, // Adjust based on your material
}
