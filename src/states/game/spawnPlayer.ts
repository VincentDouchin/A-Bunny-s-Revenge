import type { Entity, PlayerAnimations } from '@/global/entity'
import type { app } from '@/global/states'
import type { UpdateSystem } from '@/lib/app'
import type { weapons } from '@assets/assets'
import { Animator } from '@/global/animator'
import { Faction, stateBundle, States } from '@/global/entity'
import { assets, ecs, save } from '@/global/init'
import { menuInputMap, playerInputMap } from '@/global/inputMaps'
import { ModifierContainer } from '@/global/modifiers'
import { collisionGroups } from '@/lib/collisionGroups'
import { isCardinalDirection } from '@/lib/directions'
import { inMap } from '@/lib/hierarchy'
import { capsuleColliderBundle, characterControllerBundle } from '@/lib/models'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { chestAppearing } from '@/particles/chestAppearing'
import { dash } from '@/particles/dashParticles'
import { ActiveEvents, Cuboid } from '@dimforge/rapier3d-compat'
import { Euler, LinearSRGBColorSpace, Mesh, Quaternion, Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { RoomType } from '../dungeon/generateDungeon'
import { healthBundle } from '../dungeon/health'
import { spawnChest } from '../dungeon/spawnChest'
import { Dash } from './dash'
import { inventoryBundle } from './inventory'
import { weaponBundle } from './weapon'

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

export const playerBundle = (health: number, weapon: weapons | null) => {
	const model = clone(assets.characters.BunnyClothed.scene)
	model.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
		}
	})
	model.scale.multiplyScalar(4.5)
	const size = new Vector3(5, 6, 5)
	const bundle = capsuleColliderBundle(model, size)
	bundle.bodyDesc
		.setAdditionalMass(1)
		.setLinearDamping(20)
		.setUserData('player')
	bundle.colliderDesc
		.setCollisionGroups(collisionGroups('player', ['obstacle', 'enemy', 'floor']))
		.setActiveEvents(ActiveEvents.COLLISION_EVENTS)

	const debuffsContainer = new CSS2DObject(document.createElement('div'))
	debuffsContainer.position.setY(15)

	const player = {
		debuffsContainer,
		...menuInputMap(),
		...playerInputMap(),
		...inventoryBundle(Number.POSITIVE_INFINITY, 'player'),
		...bundle,
		...characterControllerBundle(),
		playerAnimator: new Animator(bundle.model, assets.characters.BunnyClothed.animations, playerAnimationMap),
		...inMap(),
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
		critDamage: new Stat(0.20),
		attackSpeed: new Stat(1),
		npcName: 'Player',
		lastStep: { right: false, left: false },
		...healthBundle(10, health),
		...stateBundle(States.player, 'idle'),
		dashParticles: dash(2),
		hitTimer: new Timer(1000, true),
		dash: new Dash(1000),
		sneeze: new Timer(2000, false),
		poisoned: new Timer(500, false),
		sleepy: new Timer(2000, false),
		modifiers: new ModifierContainer(),
		...(weapon !== null ? { weapon: weaponBundle(weapon) } : {}),
	} as const satisfies Entity

	for (const item of save.modifiers) {
		player.modifiers.addModifier(item)
	}
	player.playerAnimator.init('idle')
	return player
}
const doorQuery = ecs.with('door', 'position', 'rotation')
export const spawnCharacter: UpdateSystem<typeof app, 'farm' | 'village'> = (resources) => {
	const position = new Vector3()
	const rotation = new Quaternion()
	if (resources.door) {
		const door = doorQuery.entities.find(e => e.door === resources.door)
		if (door) {
			const rawRotation = new Euler().setFromQuaternion(door.rotation).y
			position.copy(door.position)
			rotation.copy(new Quaternion().setFromEuler(new Euler(0, rawRotation, 0)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)))
		}
	}
	const player = {
		...playerBundle(PLAYER_DEFAULT_HEALTH, null),
		position,
		rotation,
		targetRotation: rotation.clone(),
	}

	ecs.add(player)
}

export const spawnPlayerDungeon: UpdateSystem<typeof app, 'dungeon'> = (resources) => {
	const isStart = resources.dungeon.type === RoomType.Entrance && resources.firstEntry
	for (const door of doorQuery) {
		if ((isStart && isCardinalDirection(door.door)) ? resources.dungeon.doors[door.door] === null : door.door === resources.direction) {
			const rotation = door.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
			ecs.add({
				...playerBundle(resources.playerHealth, resources.weapon),
				position: door.position.clone(),
				rotation,
				targetRotation: rotation.clone(),
			})
		}
	}
}
export const spawnPlayerClearing = () => {
	for (const door of doorQuery) {
		if (door.door === 'south') {
			const rotation = door.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
			ecs.add({
				...playerBundle(PLAYER_DEFAULT_HEALTH, null),
				position: new Vector3(...door.position.toArray()).add(new Vector3(0, 0, -20).applyQuaternion(door.rotation)),
				rotation,
				targetRotation: rotation.clone(),
			})
		}
	}
}
