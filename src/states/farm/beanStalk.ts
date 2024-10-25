// import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
// import { Color, MeshBasicMaterial, PlaneGeometry, Vector3, Vector4 } from 'three'

// import { bounceOut } from 'popmotion'
// import { Bezier, ConstantColor, ConstantValue, IntervalValue, ParticleSystem, PiecewiseBezier, RenderMode, SizeOverLife, SphereEmitter } from 'three.quarks'
// import { itemBundle } from '../game/items'
// import { getIntersections } from '../game/sensor'
// import { getGrowthStages, updateCropsSave } from './farming'
// import { Interactable } from '@/global/entity'
// import { assets, dayTime, ecs, save, tweens } from '@/global/init'
// import { inMap } from '@/lib/hierarchy'
// import { getWorldPosition } from '@/lib/transforms'
// import { completeQuestStep, hasCompletedStep, hasQuest, removeItemFromPlayer } from '@/utils/dialogHelpers'

// const magicParticles = () => {
// 	const system = new ParticleSystem({
// 		duration: 3,
// 		looping: true,
// 		prewarm: false,
// 		instancingGeometry: new PlaneGeometry(1),
// 		startLife: new IntervalValue(2.0, 5.0),
// 		startSpeed: new ConstantValue(0.1),
// 		startColor: new ConstantColor(new Vector4(...new Color(0xCC99FF).toArray(), 1)),
// 		worldSpace: true,
// 		emissionOverTime: new ConstantValue(20),
// 		emissionBursts: [],
// 		shape: new SphereEmitter({ radius: 5 }),
// 		material: new MeshBasicMaterial({ transparent: true, color: 0xCC99FF }),
// 		renderMode: RenderMode.BillBoard,
// 		renderOrder: 1,
// 		behaviors: [
// 			new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.50, 0.25, 0), 0]])),
// 		],
// 	})
// 	system.emitter.position.setY(5)

// 	return system.emitter
// }

// const MAGIC_BEAN_CROP_ID = 'magic_bean'

// const addBeanStalkHole = () => {
// 	const holeModel = assets.models.plantedHole.scene.clone()
// 	holeModel.scale.multiplyScalar(3)

// 	const hole = ecs.add({
// 		model: holeModel,
// 		position: new Vector3(28, 0, -82),
// 		bodyDesc: RigidBodyDesc.fixed(),
// 		colliderDesc: ColliderDesc.cylinder(3, 3),
// 		...inMap(),
// 	})

// 	const addBeanStalkEntity = (grown: boolean) => {
// 		const beanStalkModel = assets.models.Beanstalk.scene.clone()
// 		const scale = 20
// 		if (grown) {
// 			beanStalkModel.scale.setScalar(scale)
// 		} else {
// 			tweens.add({
// 				from: beanStalkModel.scale.clone(),
// 				to: new Vector3(20, 20, 20),
// 				ease: bounceOut,
// 				duration: 2000,
// 				onUpdate: f => beanStalkModel.scale.copy(f),
// 			})
// 		}
// 		const crop = save.crops[MAGIC_BEAN_CROP_ID] ?? {
// 			luck: 0,
// 			name: 'magic_bean',
// 			planted: dayTime.dayLight,
// 			watered: false,
// 			stage: 4,
// 		}
// 		const beanStalk = ecs.add({
// 			model: beanStalkModel,
// 			position: beanStalkModel.getObjectByName('root')!.position.multiplyScalar(-scale),
// 			parent: hole,
// 			crop,
// 			beanstalk: true,
// 		})
// 		ecs.update(hole, {
// 			planted: beanStalk,
// 			plantableSpot: MAGIC_BEAN_CROP_ID,
// 		})

// 		return beanStalk
// 	}
// 	if (hasQuest('alice_1') && !hasCompletedStep('alice_1', 'plantBean')) {
// 		ecs.update(hole, {
// 			interactable: Interactable.MagicBean,
// 			onPrimary() {
// 				addBeanStalkEntity(false)
// 				removeItemFromPlayer({ name: 'magic_bean', quantity: 1 })
// 				ecs.removeComponent(hole, 'interactable')
// 				ecs.removeComponent(hole, 'onPrimary')
// 				updateCropsSave()
// 				completeQuestStep('alice_1', 'plantBean')
// 			},
// 		})
// 	}
// 	if (hasCompletedStep('alice_1', 'plantBean')) {
// 		addBeanStalkEntity(true)
// 	}
// }
// const beanstalkQuery = ecs.with('beanstalk', 'crop', 'model').without('magicHaricot')
// export const growMagicBean = () => {
// 	for (const beanstalk of beanstalkQuery) {
// 		if (getGrowthStages(beanstalk.crop) >= 4) {
// 			const haricotModel = assets.items.haricot.model.clone()
// 			haricotModel.scale.multiplyScalar(10)
// 			const magicHaricot = ecs.add({
// 				model: haricotModel,
// 				position: beanstalk.model.getObjectByName('bean')!.position.multiplyScalar(20),
// 				parent: beanstalk,
// 				emitter: magicParticles(),
// 				bodyDesc: RigidBodyDesc.fixed(),
// 				colliderDesc: ColliderDesc.cylinder(10, 3).setSensor(true),
// 				interactable: Interactable.Harvest,
// 			})
// 			ecs.update(beanstalk, { magicHaricot })
// 		}
// 	}
// }
// const magicHaricotQuery = ecs.with('interactable', 'parent', 'collider', 'group').where(e => Boolean(e.parent.beanstalk) && e.interactable === Interactable.Harvest)
// const playerQuery = ecs.with('player', 'sensor', 'playerControls', 'position', 'rotation')
// export const harvestMagicBean = () => {
// 	for (const player of playerQuery) {
// 		if (player.playerControls.get('primary').justPressed) {
// 			for (const magicHaricot of magicHaricotQuery) {
// 				if (getIntersections(player, undefined, c => c === magicHaricot.collider)) {
// 					ecs.remove(magicHaricot)
// 					ecs.add({
// 						...itemBundle('magic_bean'),
// 						position: getWorldPosition(magicHaricot.parent.group!),
// 					})
// 				}
// 			}
// 		}
// 	}
// }