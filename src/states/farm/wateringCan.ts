import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import type { CustomVFXParticlesOptions } from '@/lib/particles'
import { Mesh } from 'three/webgpu'
import { FORWARD } from '@/constants/vectors'
import { Interactable } from '@/global/entity'
import { assets, ecs, gameInputs, tweens } from '@/global/init'
import { getParticleFromPool } from '@/lib/particles'
import { GardenPlotMaterial } from '@/shaders/gardenPlotMaterial'
import { lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'
import { getIntersections } from '../game/sensor'

export const wateringCanParticles: CustomVFXParticlesOptions = {
	autoStart: false,
	world: true,
	maxParticles: 500,
	delay: 0.0,
	size: [1, 1],
	fadeSize: [1, 2],
	colorStart: ['#3388de', '#36c5f4'],
	gravity: [0, -25, 0],
	speed: [15, 20],
	lifetime: [2, 4],
	friction: {
		intensity: [0.05, 0],
		easing: 'linear',
	},
	direction: [
		[-1, 1],
		[-1, -1],
		[-1, 1],
	],
	startPosition: [
		[-3.8, 0],
		[0, 0],
		[0, 0],
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
	emitterAngle: 0,
	emitterDirection: [0, 0, 1],
}

export const wateringCanBundle = () => {
	const model = assets.models.WateringCan.scene.clone()
	model.scale.setScalar(0.3)
	model.rotateY(-Math.PI / 2)
	const spout = model.getObjectByName('spout')!
	const entity = ecs.add({
		model,
		waterAmount: 0,
		wateringCanParticles: getParticleFromPool('wateringCanParticles', spout),
	})
	return entity
}

const wateringCanQuery = ecs.with('wateringCan', 'model', 'sensor', 'position', 'rotation', 'playerAnimator', 'movementForce', 'targetRotation')

export const updateSpotWatered = (plot: With<Entity, 'model' | 'planted'>, watered: boolean, instant: boolean) => {
	const [from, to] = watered ? [0, 1] : [1, 0]
	const updateUniform = (val: number) => {
		plot.model?.traverse((node) => {
			if (!node.name.includes('rock') && node instanceof Mesh && node.material instanceof GardenPlotMaterial && 'water' in node.material) {
				node.material.water.value = val
			}
		})
	}
	if (instant) {
		updateUniform(to)
	} else {
		tweens.add({ from, to, duration: 1000, onUpdate: updateUniform })
	}
}
const plantsToWaterQuery = ecs.with('interactable', 'collider', 'parent', 'crop', 'position').where((e) => e.interactable === Interactable.Water)
const plantedQuery = ecs.with('planted', 'entityId', 'model')
export const waterCrops = () => {
	for (const player of wateringCanQuery) {
		for (const plant of plantsToWaterQuery) {
			if (gameInputs.get('primary').justPressed && player.wateringCan.waterAmount > 0 && !plant.crop?.watered && getIntersections(player, undefined, (c) => c === plant.collider)) {
				const dir = plant.parent.position!.clone().sub(player.position).normalize()
				player.targetRotation.setFromUnitVectors(FORWARD, dir)
				ecs.removeComponent(plant, 'interactable')
				ecs.reindex(plant)
				lockPlayer()
				player.wateringCan.wateringCanParticles.start()
				player.playerAnimator.playOnce('pickup', {}, 0.1)?.then(() => {
					player.wateringCan.wateringCanParticles.stop()
					unlockPlayer()
					player.playerAnimator.play('idle')
				})
				player.wateringCan.waterAmount -= 0.1
				for (const plot of plantedQuery) {
					if (plot.planted === plant) {
						updateSpotWatered(plot, true, false)
						plant.crop.watered = true
						plant.crop.luck += 0.25
					}
				}
			}
		}
	}
}
