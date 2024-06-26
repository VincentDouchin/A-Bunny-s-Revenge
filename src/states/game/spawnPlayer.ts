import type { weapons } from '@assets/assets'
import { ActiveEvents, Cuboid } from '@dimforge/rapier3d-compat'
import { LinearSRGBColorSpace, Mesh, Quaternion, Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { behaviorBundle } from '../../lib/behaviors'
import { RoomType } from '../dungeon/generateDungeon'
import { healthBundle } from '../dungeon/health'
import { inventoryBundle } from './inventory'
import { weaponBundle } from './weapon'

import { Dash } from './dash'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import type { Entity, PlayerAnimations } from '@/global/entity'
import { Faction } from '@/global/entity'

import { assets, ecs } from '@/global/init'
import { menuInputMap, playerInputMap } from '@/global/inputMaps'
import { save, updateSave } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { openMenuState } from '@/global/states'

import { ModifierContainer } from '@/global/modifiers'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { capsuleColliderBundle, characterControllerBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'

const playerAnimationMap: Record<PlayerAnimations, Animations['Bunny']> = {
	idle: 'IDLE_NEW',
	running: 'RUN_ALT',
	lightAttack: 'ATTACK_NEW_1',
	slashAttack: 'ATTACK_NEW_2',
	heavyAttack: 'NEW_ATTACK_3',
	hit: 'HURT',
	dying: 'DEATH',
}

export const PLAYER_DEFAULT_HEALTH = 10

export const playerBundle = (health: number, weapon: weapons | null) => {
	const model = clone(assets.characters.Bunny.scene)
	model.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
		}
	})
	const bundle = capsuleColliderBundle(model, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	const debuffsContainer = new CSS2DObject(document.createElement('div'))
	debuffsContainer.position.setY(15)
	bundle.colliderDesc.setCollisionGroups(collisionGroups('player', ['obstacle', 'enemy', 'floor'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS)
	const player = {
		debuffsContainer,
		...menuInputMap(),
		...playerInputMap(),
		...inventoryBundle(Number.POSITIVE_INFINITY, 'player'),
		...bundle,
		...characterControllerBundle(),
		playerAnimator: new Animator(bundle.model, assets.characters.Bunny.animations, playerAnimationMap),
		...inMap(),
		cameratarget: true,
		faction: Faction.Player,
		sensor: { shape: new Cuboid(3, 3, 3), distance: 1.5 + Sizes.character.x / 2 },
		// sensorDesc: ColliderDesc.cuboid(3, 3, 3).setTranslation(0, 1.5, 5).setSensor(true).setMass(0).setCollisionGroups(collisionGroups('player', ['obstacle', 'enemy', 'floor'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS),
		player: true,
		movementForce: new Vector3(),
		targetMovementForce: new Vector3(),
		speed: new Stat(50),
		lootQuantity: new Stat(0),
		lootChance: new Stat(0),
		strength: new Stat(1),
		critChance: new Stat(0.05),
		critDamage: new Stat(0.20),
		attackSpeed: new Stat(1),
		lastStep: { right: false, left: false },
		...healthBundle(10, health),
		...behaviorBundle('player', 'idle'),
		hitTimer: new Timer(500, true),
		dash: new Dash(1000),
		sneeze: new Timer(2000, false),
		poisoned: new Timer(500, false),
		sleepy: new Timer(2000, false),
		modifiers: new ModifierContainer(),
		combo: {
			lastAttack: 0,
			heavyAttack: 0,
		},
		...(weapon !== null ? { weapon: weaponBundle(weapon) } : {}),
	} as const satisfies Entity

	for (const item of save.modifiers) {
		player.modifiers.addModifier(item)
	}
	return player
}

export const spawnCharacter: System<FarmRessources> = (ressources) => {
	const [position, rotation] = ressources?.previousState === 'dungeon'
		? [new Vector3(), new Quaternion()]
		: [new Vector3().fromArray(save.playerPosition), new Quaternion().fromArray(save.playerRotation)]
	if (ressources?.previousState === 'dungeon') {
		updateSave(s => s.modifiers = [])
	}

	ecs.add({
		...playerBundle(PLAYER_DEFAULT_HEALTH, null),
		position,
		rotation,
		targetRotation: rotation.clone(),
	})
}

const doorQuery = ecs.with('door', 'position', 'rotation')
export const spawnPlayerDungeon: System<DungeonRessources> = (ressources) => {
	const isStart = ressources.dungeon.type === RoomType.Entrance && ressources.firstEntry
	for (const door of doorQuery) {
		if (isStart ? ressources.dungeon.doors[door.door] === null : door.door === ressources.direction) {
			const rotation = door.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
			ecs.add({
				...playerBundle(ressources.playerHealth, ressources.weapon),
				position: new Vector3(...door.position.toArray()).add(new Vector3(0, 0, -20).applyQuaternion(door.rotation)),
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
const playerQuery = ecs.with('player', 'position')

export const losingBattle = () => playerQuery.onEntityRemoved.subscribe((e) => {
	openMenuState.enable()
	ecs.add({ ...inMap(), position: e.position, cameratarget: true })
})
