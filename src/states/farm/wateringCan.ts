import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import type { Quaternion } from 'three'
import { CircleGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { ApplyForce, ColorRange, ConeEmitter, ConstantValue, IntervalValue, ParticleSystem, RandomQuatGenerator, RenderMode } from 'three.quarks'
import { getIntersections } from '../game/sensor'
import { updateCropsSave } from './farming'
import { colorToVec4 } from '@/particles/honeySplatParticles'
import { getWorldRotation } from '@/lib/transforms'
import { batchRendererQuery } from '@/lib/particles'
import { assets, ecs, gameTweens } from '@/global/init'
import { Interactable } from '@/global/entity'
import type { Entity } from '@/global/entity'

const waterParticles = (rotation: Quaternion) => {
	const system = new ParticleSystem({
		duration: 5,
		looping: false,
		prewarm: true,
		instancingGeometry: new CircleGeometry(1, 8),
		startLife: new IntervalValue(10.0, 15.0),
		startSpeed: new ConstantValue(2),
		startSize: new ConstantValue(0.3),
		startColor: new ColorRange(colorToVec4(0x36C5F4), colorToVec4(0x3388DE)),
		startRotation: new RandomQuatGenerator(),
		worldSpace: true,
		emissionOverDistance: new ConstantValue(0),
		emissionOverTime: new ConstantValue(20),
		emissionBursts: [],
		shape: new ConeEmitter({ radius: 1 }),
		material: new MeshBasicMaterial({ color: 0x000000, depthWrite: false }),
		renderMode: RenderMode.BillBoard,
		renderOrder: 1,
		behaviors: [
			new ApplyForce(new Vector3(0, 0, -0.5).applyQuaternion(rotation).add(new Vector3(0, -0.5, 0)), new ConstantValue(1)),
		],
	})
	system.emitter.rotateX(Math.PI / 2)
	return system.emitter
}

export const wateringCanBundle = () => {
	return ecs.add({
		model: assets.models.WateringCan.scene.clone(),
		waterAmount: 0,
	})
}

const wateringCanQuery = ecs.with('wateringCan', 'model', 'sensor', 'playerControls', 'position', 'rotation')

export const updateSpotWatered = (plot: With<Entity, 'model' | 'planted'>, watered: boolean, instant: boolean) => {
	const [start, end] = watered ? [0, 1] : [1, 0]
	const updateUniform = (val: number) => {
		plot.model?.traverse((node) => {
			if (!node.name.includes('rock') && node instanceof Mesh && node.material) {
				node.material.uniforms.water.value = val
			}
		})
	}
	if (instant) {
		updateUniform(end)
	} else {
		const tween = new Tween([start])
			.to([end], 2000)
			.onUpdate(([f]) => {
				updateUniform(f)
			})
		gameTweens.add(tween)
	}
}
const plantsToWaterQuery = ecs.with('interactable', 'collider', 'parent', 'crop').where(e => e.interactable === Interactable.Water)
const plantedQuery = ecs.with('planted', 'entityId', 'model')
export const waterCrops = () => {
	for (const player of wateringCanQuery) {
		for (const plant of plantsToWaterQuery) {
			if (
				player.playerControls.get('primary').justPressed
				&& player.wateringCan.waterAmount > 0
				&& !plant.crop?.watered
				&& getIntersections(player, undefined, c => c === plant.collider)
			) {
				player.wateringCan.waterAmount -= 0.1
				for (const plot of plantedQuery) {
					if (plot.planted === plant) {
						updateSpotWatered(plot, true, false)

						plant.crop.watered = true
						plant.crop.luck += 0.25
						updateCropsSave()
					}
				}
				ecs.removeComponent(plant, 'interactable')
				const spout = player.wateringCan.model.getObjectByName('spout')
				const batchRenderer = batchRendererQuery.first
				if (spout && batchRenderer) {
					const water = waterParticles(getWorldRotation(spout))
					spout.add(water)
					batchRenderer.batchRenderer.addSystem(water.system)
				}
			}
		}
	}
}
