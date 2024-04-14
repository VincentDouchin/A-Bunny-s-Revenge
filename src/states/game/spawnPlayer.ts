import type { weapons } from '@assets/assets'
import { LinearSRGBColorSpace, Mesh, NearestFilter, Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { ActiveCollisionTypes, ColliderDesc } from '@dimforge/rapier3d-compat'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { RoomType } from '../dungeon/generateDungeon'
import { healthBundle } from '../dungeon/health'
import { behaviorBundle } from '../../lib/behaviors'
import { inventoryBundle } from './inventory'
import { weaponBundle } from './weapon'

import { Dash } from './dash'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import type { Entity, PlayerAnimations } from '@/global/entity'
import { Faction } from '@/global/entity'

import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { save, updateSave } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { openMenuState } from '@/global/states'

import { itemsData } from '@/constants/items'
import { inMap } from '@/lib/hierarchy'
import { capsuleColliderBundle, characterControllerBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { Stat, addModifier } from '@/lib/stats'
import { Timer } from '@/lib/timer'

const playerAnimationMap: Record<PlayerAnimations, Animations['Bunny']> = {
	idle: 'IDLE_NEW',
	running: 'RUN_ALT',
	lightAttack: 'FIGHT_ACTION1',
	slashAttack: 'SLASH',
	heavyAttack: 'HEAVYATTACK',
}
export const playerBundle = (health: number, addHealth: boolean, weapon: weapons | null) => {
	const model = clone(assets.characters.Bunny.scene)
	model.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
			node.material.map.minFilter = NearestFilter
			node.material.map.magFilter = NearestFilter
			node.material.opacity = 1
		}
	})
	const bundle = capsuleColliderBundle(model, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	const debuffsContainer = new CSS2DObject(document.createElement('div'))
	debuffsContainer.position.setY(15)
	const player = {
		debuffsContainer,
		...playerInputMap(),
		...inventoryBundle(Number.POSITIVE_INFINITY, 'player'),
		...bundle,
		...characterControllerBundle(),
		playerAnimator: new Animator(bundle.model, assets.characters.Bunny.animations, playerAnimationMap),
		...inMap(),
		cameratarget: true,
		faction: Faction.Player,
		sensorDesc: ColliderDesc.cuboid(2, 2, 2).setTranslation(0, 1, 5).setSensor(true).setMass(0).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		player: true,
		movementForce: new Vector3(),
		speed: new Stat(50),
		lootQuantity: new Stat(0),
		lootChance: new Stat(0),
		strength: new Stat(1),
		critChance: new Stat(0.05),
		critDamage: new Stat(0.20),
		attackSpeed: new Stat(1),
		lastStep: { right: false, left: false },
		...healthBundle(5, health),
		...behaviorBundle('player', 'idle'),
		hitTimer: new Timer(500, true),
		dash: new Dash(1000),
		sneeze: new Timer(2000, false),
		combo: {
			lastAttack: 0,
			heavyAttack: 0,
		},
	} as const satisfies Entity
	if (weapon !== null) {
		ecs.update(player, { weapon: weaponBundle(weapon) })
	}
	for (const modKey of save.modifiers) {
		const mod = Object.values(itemsData).flatMap(i => i.meal).find(m => m?.key === modKey)
		if (mod) {
			addModifier(mod, player, addHealth)
		}
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
		...playerBundle(5, true, null),
		position,
		rotation,
	})
}

const doorQuery = ecs.with('door', 'position', 'rotation')
export const spawnPlayerDungeon: System<DungeonRessources> = (ressources) => {
	const isStart = ressources.dungeon.type === RoomType.Entrance && ressources.firstEntry
	for (const door of doorQuery) {
		if (isStart ? ressources.dungeon.doors[door.door] === null : door.door === ressources.direction) {
			ecs.add({
				...playerBundle(ressources.playerHealth, ressources.firstEntry, ressources.weapon),
				position: new Vector3(...door.position.toArray()).add(new Vector3(0, 0, -20).applyQuaternion(door.rotation)),
				rotation: door.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)),
			})
		}
	}
}
export const spawnPlayerClearing = () => {
	for (const door of doorQuery) {
		if (door.door === 'south') {
			ecs.add({
				...playerBundle(5, true, null),
				position: new Vector3(...door.position.toArray()).add(new Vector3(0, 0, -20).applyQuaternion(door.rotation)),
				rotation: door.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)),
			})
		}
	}
}
const playerQuery = ecs.with('player', 'position')

export const losingBattle = () => playerQuery.onEntityRemoved.subscribe((e) => {
	openMenuState.enable()
	ecs.add({ ...inMap(), position: e.position, cameratarget: true })
})
