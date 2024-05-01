import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { RoomType, genDungeon } from '../dungeon/generateDungeon'
import { Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { save } from '@/global/save'
import { playSound } from '@/global/sounds'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState, genDungeonState } from '@/global/states'
import { otherDirection } from '@/lib/directions'
import type { System } from '@/lib/state'
import { doorClosed } from '@/particles/doorClosed'
import vertexShader from '@/shaders/glsl/main.vert?raw'

export const doorSide = () => {
	const mesh = new Mesh(
		new PlaneGeometry(120, 80),
		new ShaderMaterial({
			side: DoubleSide,
			transparent: true,
			vertexShader,
			fragmentShader: /* glsl */`
			varying vec2 vUv;
			void main(){
				gl_FragColor = vec4(0.,0.,0.,smoothstep(0.,0.8,vUv.x));
			}
		`,
		}),
	)
	mesh.material.depthWrite = false
	mesh.rotateX(-Math.PI / 2 - Math.PI / 180 * 10)
	mesh.rotateZ(-Math.PI / 2)
	mesh.position.z = 10
	mesh.position.y = 15
	mesh.renderOrder = -1
	const doorBack = new Mesh(
		new PlaneGeometry(80, 30),
		new MeshBasicMaterial({ color: 0x000000, side: DoubleSide }),
	)
	doorBack.position.set(0, 15, 80)
	const door = new Group()
	door.add(mesh)
	door.add(doorBack)
	return door
}

const doorQuery = ecs.with('collider', 'door', 'collider')
const playerQuery = ecs.with('collider', 'playerControls', 'currentHealth').without('ignoreDoor')
const enemyQuery = ecs.with('faction').where(({ faction }) => faction === Faction.Enemy)
const doorToLockQuery = doorQuery.with('doorLocked')
const doorToUnlockQuery = doorToLockQuery.with('emitter')
export const collideWithDoor: System<DungeonRessources> = ({ dungeon, dungeonLevel, weapon }) => {
	if (doorToUnlockQuery.size > 0 && enemyQuery.size === 0) {
		for (const door of doorToUnlockQuery) {
			ecs.removeComponent(door, 'doorLocked')
		}
		playSound('zapsplat_multimedia_game_tone_twinkle_bright_collect_gain_level_up_50730')
	}
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				const nextRoom = dungeon.doors[door.door]
				if (nextRoom) {
					dungeonState.enable({ dungeon: nextRoom, direction: otherDirection[door.door], playerHealth: player.currentHealth, firstEntry: false, dungeonLevel, weapon })
				} else {
					if (dungeon.type === RoomType.Boss) {
						campState.enable({ previousState: 'dungeon' })
					} else {
						campState.enable({})
					}
				}
			}
		}
	}
}
export const collideWithDoorCamp = () => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				genDungeonState.enable()
			}
		}
	}
}
export const collideWithDoorClearing = () => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				if (door.doorLevel !== undefined && player.weapon) {
					const dungeon = genDungeon(5 + door.doorLevel * 5, true).find(room => room.type === RoomType.Entrance)!
					dungeonState.enable({ dungeon, direction: 'south', firstEntry: true, playerHealth: 10, dungeonLevel: door.doorLevel, weapon: player.weapon.weaponName })
				}
				if (door.doorLevel === undefined) {
					campState.enable({})
				}
			}
		}
	}
}
const doorClearingQuery = doorQuery.with('doorLevel')
const playerWithWeaponQuery = playerQuery.with('weapon')

export const unlockDoorClearing = () => playerWithWeaponQuery.onEntityAdded.subscribe(() => {
	for (const door of doorClearingQuery) {
		if (door.doorLevel < save.unlockedPaths) {
			ecs.removeComponent(door, 'doorLocked')
		}
	}
})

const playerInDoor = ecs.with('playerControls', 'ignoreDoor', 'collider')
export const allowDoorCollision: System<DungeonRessources> = () => {
	for (const player of playerInDoor) {
		for (const door of doorQuery) {
			if (door.door === player.ignoreDoor && !world.intersectionPair(player.collider, door.collider)) {
				ecs.removeComponent(player, 'ignoreDoor')
			}
		}
	}
}

const lockDoors = () => doorToLockQuery.onEntityAdded.subscribe((e) => {
	e.collider.setSensor(false)
	ecs.update(e, { emitter: doorClosed() })
})
const unlockDoors = () => doorToUnlockQuery.onEntityRemoved.subscribe((e) => {
	e.collider.setSensor(true)
	e.emitter.system.looping = false
})
export const doorLocking = [lockDoors, unlockDoors]