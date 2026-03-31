import type { CustomVFXParticlesOptions } from '@/lib/particles'

export const dashParticles: CustomVFXParticlesOptions = {
	world: true,
	maxParticles: 100,
	autoStart: false,
	delay: 0.035,
	depthTest: false,
	emitCount: 2,
	size: [3, 5],
	colorStart: ['#FFFFFF'],
	colorEnd: ['#888888'],
	speed: [1, 2],
	lifetime: [0.5, 1.5],
	friction: {
		intensity: [0.1, 0],
		easing: 'linear',
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
	position: [0, 0.5, 0],
	appearance: 'circular',
	lighting: 'basic',
	emitterShape: 2,
	emitterAngle: 0,
	emitterDirection: [0, 0, 1],
	turbulence: {
		intensity: 5,
		frequency: 10,
		speed: 5,
	},
}
