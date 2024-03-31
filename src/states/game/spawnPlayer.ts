import { LinearSRGBColorSpace, Mesh, NearestFilter, Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import type { weapons } from '@assets/assets'
import { healthBundle } from '../dungeon/health'
import { RoomType } from '../dungeon/generateDungeon'
import { inventoryBundle } from './inventory'
import { weaponBundle } from './weapon'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { save, updateSave } from '@/global/save'
import { openMenuState } from '@/global/states'
import type { DungeonRessources, FarmRessources } from '@/global/states'

import { capsuleColliderBundle, characterControllerBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { stateBundle } from '@/lib/stateMachine'
import { Stat, addModifier } from '@/lib/stats'

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
	const player = {
		...playerInputMap(),
		...inventoryBundle(Number.POSITIVE_INFINITY, 'player'),
		...bundle,
		...characterControllerBundle(),
		playerAnimator: new Animator(bundle.model, assets.characters.Bunny.animations),
		inMap: true,
		cameratarget: true,
		initialCameratarget: true,
		faction: Faction.Player,
		sensor: true,
		player: true,
		movementForce: new Vector3(),
		speed: 50,
		strength: new Stat(1),
		critChance: new Stat(0.05),
		critDamage: new Stat(0.20),
		attackSpeed: new Stat(1),
		lootQuantity: new Stat(1),
		lootRarity: new Stat(1),
		lastStep: { right: false, left: false },
		...healthBundle(5, health),
		...stateBundle<'idle' | 'running' | 'picking' | 'hit' | 'dying' | 'dead' | 'attacking' | 'waitingAttack' | 'cheer'>('idle', {
			idle: ['running', 'picking', 'hit', 'waitingAttack', 'cheer'],
			running: ['idle', 'hit', 'waitingAttack', 'dying'],
			picking: ['idle'],
			hit: ['idle', 'dying'],
			dying: ['dead'],
			attacking: ['idle', 'dying'],
			dead: [],
			waitingAttack: ['attacking'],
			cheer: ['idle'],
		}),
		combo: {
			lastAttack: 0,
			heavyAttack: 0,
		},
	} as const satisfies Entity
	if (weapon !== null) {
		ecs.update(player, { weapon: weaponBundle(weapon) })
	}
	for (const mod of save.modifiers) {
		addModifier(mod, player, addHealth)
	}
	return player
}

export const spawnCharacter: System<FarmRessources> = ({ previousState }) => {
	const [position, rotation] = previousState === 'dungeon'
		? [new Vector3(), new Quaternion()]
		: [new Vector3().fromArray(save.playerPosition), new Quaternion().fromArray(save.playerRotation)]
	if (previousState === 'dungeon') {
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
	ecs.add({ inMap: true, position: e.position, cameratarget: true })
})

export const debugPlayer = () => {
	for (const player of ecs.with('playerControls')) {
		if (player.playerControls.get('primary').justPressed) {
			// addCameraShake()
		}
	}
}