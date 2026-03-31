import type { CustomVFXParticlesOptions } from '@/lib/particles'

export const enemyDefeatedParticles: CustomVFXParticlesOptions = {
	world: true,
	maxParticles: 200,
	position: [0, 3, 0],
	autoStart: false,
	size: [3, 5],
	fadeSize: [1, 0.4],
	colorStart: ['#a855f7', '#8b5cf6'],
	speed: [8.94, 15],
	lifetime: [1, 1],
	velocityCurve: {
		points: [
			{
				pos: [0, 1],
				handleOut: [0, 0],
			},
			{
				pos: [0.6492852783203125, 1],
				handleIn: [-0.1, 0],
				handleOut: [0.1, 0],
			},
			{
				pos: [1, 0],
				handleIn: [0.03428527832031247, 0.9628573608398437],
			},
		],
	},
	direction: [
		[-1, 1],
		[1, 1],
		[-1, 1],
	],
	rotation: [
		[0, 0],
		[0, 0],
		[0, 0],
	],
	rotationSpeed: [
		[0, 0],
		[0, 0],
		[0, 0],
	],
	appearance: 'circular',
	lighting: 'basic',
	emitterShape: 2,
	emitterRadius: [1, 5],
	emitterAngle: 0,
	emitterDirection: [0, 0, 1],
	emitterSurfaceOnly: true,
	turbulence: {
		intensity: 5,
		frequency: 10,
		speed: 5,
	},
}
