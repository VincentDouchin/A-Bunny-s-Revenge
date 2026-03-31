import { State } from '@/behaviors/state'
import { getGameRenderGroup } from '@/debug/debugUi'
import { Animator } from '@/global/animator'
import type { AssetNames, Entity, PlayerAnimations, PlayerStates } from '@/global/entity'
import { Faction } from '@/global/entity'
import { assets, ecs, save, world } from '@/global/init'
import { ModifierContainer } from '@/global/modifiers'
import type { app } from '@/global/states'
import type { UpdateSystem } from '@/lib/app'
import { capsuleColliderBundle } from '@/lib/colliders'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { getParticleFromPool, spawnVfx } from '@/lib/particles'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { windowEvent } from '@/lib/uiManager'
import { enemyDefeatedParticles } from '@/particles/enemyDefeated'
import { sleep } from '@/utils/sleep'
import type { Animations } from '@assets/animations'
import { ActiveEvents, Cuboid } from '@dimforge/rapier3d-compat'
import { CSS2DObject, SkeletonUtils } from 'three/addons'
import { LinearSRGBColorSpace, Mesh, Quaternion, Vector3 } from 'three/webgpu'
import { healthBundle } from '../dungeon/health'
import { Dash } from './dash'
import { inventoryBundle } from './inventory'
import { weaponBundle } from './weapon'

export const characterControllerBundle = () => {
	const controller = world.createCharacterController(0.1)
	controller.setApplyImpulsesToDynamicBodies(false)
	controller.setCharacterMass(0.1)
	controller.enableAutostep(4, 0, false)
	controller.setMaxSlopeClimbAngle(0)
	return { controller } as const satisfies Entity
}

const playerAnimationMap: Record<PlayerAnimations, Animations['BunnyClothed']> = {
	idle: 'Idle',
	runFront: 'Running_B',
	runBack: 'Walking_Backwards',
	runLeft: 'Running_Strafe_Left',
	runRight: 'Running_Strafe_Right',
	lightAttack: '1H_Melee_Attack_Slice_Diagonal',
	slashAttack: '1H_Melee_Attack_Chop',
	heavyAttack: '1H_Melee_Attack_Stab',
	hit: 'Hit_A',
	fishing: '1H_Melee_Attack_Slice_Diagonal',
	sleeping: 'Lie_Idle',
	wakeUp: 'Lie_StandUp',
	interact: 'Interact',
	pickup: 'PickUp',
	dashFront: 'Dodge_Forward',
	dashLeft: 'Dodge_Left',
	dashRight: 'Dodge_Right',
	dashBack: 'Dodge_Backward',
	dead: 'Death_A',
}

export const PLAYER_DEFAULT_HEALTH = 10

export const playerBundle = async (health: number, weapon: AssetNames['weapons'] | null) => {
	const model = SkeletonUtils.clone(assets.characters.BunnyClothed.scene)
	model.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
		}
	})

	model.scale.multiplyScalar(4.5)
	const size = new Vector3(5, 6, 5)
	const bundle = capsuleColliderBundle(model, size)
	bundle.bodyDesc.setAdditionalMass(1).setLinearDamping(20).setUserData('player')
	bundle.colliderDesc.setCollisionGroups(collisionGroups('player', ['obstacle', 'enemy', 'floor'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS)

	const debuffsContainer = new CSS2DObject(document.createElement('div'))
	debuffsContainer.position.setY(15)

	const player = inMap({
		debuffsContainer,
		...inventoryBundle(Number.POSITIVE_INFINITY, 'player'),
		...bundle,
		...characterControllerBundle(),
		playerAnimator: new Animator(bundle.model, assets.characters.BunnyClothed.animations, playerAnimationMap),
		cameraTarget: true,
		faction: Faction.Player,
		sensor: { shape: new Cuboid(3, 3, 3), distance: 1.5 + size.x / 2 },
		player: true,
		playerAttackStyle: { justEntered: true, lastAttack: 0, heavyAttack: 0 },
		movementForce: new Vector3(),
		targetMovementForce: new Vector3(),
		speed: new Stat(40),
		lootQuantity: new Stat(0),
		lootChance: new Stat(0),
		strength: new Stat(1),
		critChance: new Stat(0.05),
		critDamage: new Stat(0.2),
		attackSpeed: new Stat(1),
		npcName: 'Player',
		lastStep: { right: false, left: false },
		...healthBundle(10, health),
		playerState: new State<PlayerStates>('idle'),
		hitTimer: new Timer(1000, true),
		dashIndicator: new Dash(1000),
		sneeze: new Timer(2000, false),
		poisoned: new Timer(500, false),
		sleepy: new Timer(2000, false),
		modifiers: new ModifierContainer(),
		...(weapon !== null ? { weapon: weaponBundle(weapon) } : {}),
		dashParticles: getParticleFromPool('dashParticles', bundle.model),
	})
	spawnVfx({ ...enemyDefeatedParticles }).then((vfx) => {
		getGameRenderGroup().scene.add(vfx.group)
		ecs.add({ dashParticles: vfx })
		windowEvent('keydown', async (e) => {
			if (e.code === 'KeyH') {
				vfx.start()
				await sleep(1000)
				vfx.stop()
			}
		})
	})

	for (const item of save.modifiers) {
		player.modifiers.addModifier(item)
	}
	player.playerAnimator.init('idle')
	return player
}
const doorQuery = ecs.with('door', 'position', 'rotation')
export const spawnPlayer = async (position: Vector3, rotation: Quaternion, weapon: AssetNames['weapons'] | null = null) => {
	ecs.add({
		...(await playerBundle(PLAYER_DEFAULT_HEALTH, weapon)),
		position,
		rotation: rotation.clone(),
		targetRotation: rotation.clone(),
	})
}

export const spawnPlayerFarm: UpdateSystem<typeof app, 'farm'> = async (resources) => {
	if (resources.direction === 'doorFarm') {
		for (const door of doorQuery) {
			if (door.door === 'farm') {
				const position = door.position.clone().add(new Vector3(0, 0, 10).applyQuaternion(door.rotation))
				await spawnPlayer(position, door.rotation)
			}
		}
	} else {
		spawnPlayer(new Vector3(), new Quaternion())
	}
}
export const spawnPlayerClearing = async () => {
	for (const { door, position, rotation } of doorQuery) {
		if (door === 'farm') {
			const p = position.clone().add(new Vector3(0, 0, 10).applyQuaternion(rotation))
			await spawnPlayer(p, rotation)
		}
	}
}
