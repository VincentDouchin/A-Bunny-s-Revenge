import type { Entity } from '@/global/entity'
import type { Plugin } from '@/lib/app'
import type { Material } from 'three'
import { Seedling } from '@/constants/enemies'
import { addCameraShake } from '@/global/camera'
import { assertEntity, Interactable, States, states } from '@/global/entity'
import { assets, ecs, time } from '@/global/init'
import { app } from '@/global/states'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, runNodes, selector, sequence, setState, waitFor, withContext } from '@/lib/behaviors'
import { traverseFind } from '@/lib/models'
import { addExploder } from '@/particles/exploder'
import { squish } from '@/states/dungeon/battle'
import { getRandom } from '@/utils/mapFunctions'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Mesh } from 'three'
import { attackCooldownNode, attackNode, damagedByPlayer, deadNode, enemyContext, hitNode, idleNode, runningNode, waitingAttackNode } from './commonBehaviors'
import { baseEnemyQuery } from './enemyBehavior'

const sporeQuery = ecs.with('enemyName').where(e => e.enemyName === 'pollen')

const mapQuery = ecs.with('dungeon')
const spawnSpore = (boss: Entity) => {
	const map = mapQuery.first
	if (map) {
		const spawnPoint = getRandom(map.dungeon.navgrid.getSpawnPoints())
		const resources = app.getResources('dungeon')
		if (resources?.dungeonLevel) {
			const seedling = ecs.add({
				...Seedling(resources.dungeonLevel),
				parent: map,
				position: spawnPoint,
			})
			const { onDestroy } = boss
			ecs.removeComponent(boss, 'onDestroy')
			ecs.update(boss, { onDestroy() {
				onDestroy && onDestroy()
				seedling.state.next = 'dying'
			} })
		}
	}
}

const pumpkinBossBossQuery = baseEnemyQuery.with(...states(States.pumpkinBoss), 'boss', 'pumpkinBoss', 'pumpkinBossAnimator')
export const pumpkinBossBehavior: Plugin<typeof app> = (app) => {
	app.addPlugins(
		createBehaviorTree(
			pumpkinBossBossQuery,
			withContext(
				enemyContext,
				withContext(
					(...[e]) => e.pumpkinBossAnimator,
					runNodes(
						sequence(
							inverter(inState('underground')),
							action(e => e.pumpkinBoss.summonTimer.tick(time.delta)),
						),
						selector(
							deadNode(),
							damagedByPlayer(),
							sequence(
								enteringState('summon'),
								action(e => e.pumpkinBossAnimator.playOnce('summon')),
								action(e => spawnSpore(e)),
							),
							sequence(
								inState('summon'),
								waitFor(e => !e.pumpkinBossAnimator.isPlaying('summon')),
								action(e => e.pumpkinBoss.summonTimer.reset()),
								setState('idle'),
							),
							hitNode(),
							sequence(
								condition((...[e]) => e.pumpkinBoss.summonTimer.finished() && sporeQuery.size <= 3),
								setState('summon'),
							),
							idleNode(),
							attackCooldownNode(2000)(),
							waitingAttackNode(300)(),
							attackNode()(),
							runningNode(),
						),
					),
				),
			),
		),
	)
	app.addSubscribers('game', () => pumpkinBossBossQuery.onEntityAdded.subscribe((boss) => {
		const model = assets.crops.pumpkin.stages.at(-1)!.scene.clone()
		model.scale.setScalar(30)
		boss.model.visible = false
		const mat = traverseFind<typeof Mesh>(model, node => node instanceof Mesh && 'material' in node && node.material.name === 'Orange')!.material as Material
		let hit = 0
		const pumpkin = ecs.add({
			model,
			position: boss.position.clone(),
			interactable: Interactable.Harvest,
			bodyDesc: RigidBodyDesc.fixed(),
			colliderDesc: ColliderDesc.cylinder(10, 15),
			async onPrimary(e) {
				const entity = assertEntity(e, 'group', 'exploder')
				squish(entity)
				addCameraShake()
				entity.exploder.explode(3)
				hit++
				if (hit === 3) {
					ecs.remove(e)
					boss.model.visible = true
					await boss.pumpkinBossAnimator.playOnce('spawn')
					boss.state.next = 'idle'
				}
			},
		})
		addExploder(pumpkin, mat, 5)
	}))
	app.onEnter('dungeon', () => {
		for (const boss of pumpkinBossBossQuery) {
			const model = assets.crops.pumpkin.stages.at(-1)!.scene.clone()
			model.scale.setScalar(30)
			boss.model.visible = false
			const mat = traverseFind<typeof Mesh>(model, node => node instanceof Mesh && 'material' in node && node.material.name === 'Orange')!.material as Material
			let hit = 0
			const pumpkin = ecs.add({
				model,
				position: boss.position.clone(),
				interactable: Interactable.Harvest,
				bodyDesc: RigidBodyDesc.fixed(),
				colliderDesc: ColliderDesc.cylinder(10, 15),
				async onPrimary(e) {
					const entity = assertEntity(e, 'group', 'exploder')
					squish(entity)
					addCameraShake()
					entity.exploder.explode(3)
					hit++
					if (hit === 3) {
						ecs.remove(e)
						boss.model.visible = true
						await boss.pumpkinBossAnimator.playOnce('spawn')
						boss.state.next = 'idle'
					}
				},
			})
			addExploder(pumpkin, mat, 5)
		}
	})
}
