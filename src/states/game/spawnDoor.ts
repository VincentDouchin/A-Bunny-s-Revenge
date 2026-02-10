import type { Direction } from '@/lib/directions'
import { ecs, world } from '@/global/init'
import { app } from '@/global/states'
import { otherDirection } from '@/lib/directions'
import { entries } from '@/utils/mapFunctions'
import { genDungeon, RoomType } from '../dungeon/generateDungeon'
import { PLAYER_DEFAULT_HEALTH } from './spawnPlayer'

// const doorQuery = ecs.with('collider', 'door', 'rotation')
const playerQuery = ecs.with('collider', 'currentHealth', 'position')
// const doorToLockQuery = doorQuery.with('doorLocked')
// const doorToUnlockQuery = doorQuery.without('doorLocked', 'unlocked')
// const unlockVineDoorsQuery = doorQuery.with('unlocked', 'doorType').where(e => e.doorType === 'vine')

// const onCollideWithDoor = <S extends AppStates<typeof app>>(

// 	fn: (
// 		door: QueryEntity<typeof doorQuery>,
// 		player: QueryEntity<typeof playerQuery>,
// 		resources: Resources<typeof app, S>
// 	) => void,
// ) => (resources: Resources<typeof app, S>) => {
// 	{
// 		for (const door of doorQuery) {
// 			for (const player of playerQuery) {
// 				if (world.intersectionPair(door.collider, player.collider)) {
// 					fn(door, player, resources)
// 				}
// 			}
// 		}
// 	}
// }
// export const unlockDoorDungeon: UpdateSystem<typeof app, 'dungeon'> = (resources) => {
// 	if (doorToLockQuery.size > 0 && resources.dungeon.enemies.length === 0) {
// 		for (const door of doorToLockQuery) {
// 			ecs.removeComponent(door, 'doorLocked')
// 		}
// 		playSound('zapsplat_multimedia_game_tone_twinkle_bright_collect_gain_level_up_50730')
// 	}
// }

// export const collideWithDoorDungeon = onCollideWithDoor<'dungeon'>((door, player, { dungeon, dungeonLevel, weapon }) => {
// 	if (isCardinalDirection(door.door)) {
// 		const nextRoom = dungeon.doors[door.door]
// 		if (nextRoom) {
// 			app.disable('dungeon')
// 			app.enable('dungeon', { dungeon: nextRoom, direction: otherDirection[door.door], playerHealth: player.currentHealth, firstEntry: false, dungeonLevel, weapon })
// 		} else {
// 			app.enable('farm', { door: 'clearing' })
// 		}
// 	} else {
// 		app.enable('farm', { door: door.door ?? 'clearing' })
// 	}
// })

// export const collideWithDoorCamp = onCollideWithDoor(({ door }) => {
// 	if (door === 'clearing') {
// 		app.enable('clearing')
// 	}
// 	if (door === 'village') {
// 		app.enable('village', { door: 'village' })
// 	}
// })

// export const collideWithDoorVillage = onCollideWithDoor(() => {
// 	app.enable('farm', { door: 'village' })
// })

// export const collideWithDoorClearing = onCollideWithDoor((door, player) => {
// 	if (door.doorLevel !== undefined && player.weapon) {
// 		const dungeon = genDungeon(7 + door.doorLevel * 5, true, door.doorLevel).find(room => room.type === RoomType.Entrance)!
// 		app.enable('dungeon', { dungeon, direction: Direction.S, firstEntry: true, playerHealth: player.currentHealth, dungeonLevel: door.doorLevel, weapon: player.weapon.weaponName })
// 	} else	if (door.doorLevel === undefined) {
// 		app.enable('farm', { door: 'clearing' })
// 	}
// })

// export const collideWithDoorIntro = onCollideWithDoor(({ door }) => {
// 	if (farmDoors.includes(door)) {
// 		app.enable('farm', { door: door as typeof farmDoors[number] })
// 	}
// })
// const doorClearingQuery = doorQuery.with('doorLevel')
// const playerWithWeaponQuery = playerQuery.with('weapon')

// export const unlockDoorClearing = () => playerWithWeaponQuery.onEntityAdded.subscribe(() => {
// 	for (const door of doorClearingQuery) {
// 		if (door.doorLevel <= save.unlockedPaths) {
// 			ecs.removeComponent(door, 'doorLocked')
// 		}
// 	}
// })

// const playerInDoor = ecs.with('ignoreDoor', 'collider')
// export const allowDoorCollision: UpdateSystem<typeof app, 'dungeon'> = () => {
// 	for (const player of playerInDoor) {
// 		for (const door of doorQuery) {
// 			if (door.door === player.ignoreDoor && !world.intersectionPair(player.collider, door.collider)) {
// 				ecs.removeComponent(player, 'ignoreDoor')
// 			}
// 		}
// 	}
// }

// const lockDoors = () => doorToLockQuery.onEntityAdded.subscribe((e) => {
// 	e.collider.setSensor(false)
// 	if (e.doorType === 'fog') {
// 		ecs.update(e, { emitter: doorClosed() })
// 	}
// })
// export const unlockDoors = () => doorToUnlockQuery.onEntityAdded.subscribe((e) => {
// 	e.collider.setSensor(true)

// 	if (e.doorType === 'vine') {
// 		const vinesBottom = e.model?.getObjectByName('GATE')
// 		if (vinesBottom) {
// 			playSound('zapsplat_foley_tree_palm_front_dead_large_dry_movement_ground_001_99605', { playbackRate: 1.5 })
// 			const initialPosition = vinesBottom.position.y
// 			tweens.add({
// 				from: 0,
// 				to: 1,
// 				duration: 5000,
// 				onUpdate: (f) => {
// 					vinesBottom.position.y = initialPosition - 30 * f
// 					vinesBottom.traverse((node) => {
// 						if (node instanceof Mesh && node.material instanceof VineGateMaterial) {
// 							node.material.uniforms.time.value = f * 2
// 							node.material.depthWrite = false
// 						}
// 					})
// 				},
// 			})
// 		}
// 	}
// 	if (e.emitter) {
// 		e.emitter.system.looping = false
// 	}
// })

// const hideVinesDoors = () => unlockVineDoorsQuery.onEntityAdded.subscribe((e) => {
// 	e.collider.setSensor(true)
// 	const vinesBottom = e.model?.getObjectByName('GATE')
// 	if (vinesBottom) {
// 		vinesBottom.position.y -= 30
// 	}
// })
// export const doorLocking = [lockDoors, unlockDoors, hideVinesDoors]
const doorsQuery = ecs.with('door', 'collider').without('doorLocked')
export const collideWithDoorFarm = async () => {
	for (const door of doorsQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				app.enable('clearing')
				doorsQuery.remove(door)
			}
		}
	}
}
const playerWithWeaponQuery = playerQuery.with('weapon')
export const collideWithDoorClearing = async () => {
	for (const door of doorsQuery) {
		if (door.door === 'farm') {
			for (const player of playerQuery) {
				if (world.intersectionPair(door.collider, player.collider)) {
					app.enable('farm', { direction: 'doorFarm' })
					doorsQuery.remove(door)
				}
			}
		}
		if (door.door === 'dungeon') {
			for (const player of playerWithWeaponQuery) {
				if (world.intersectionPair(door.collider, player.collider)) {
					const dungeon = genDungeon(8, false)
					const start = dungeon.find(r => r.type === RoomType.Entrance)!
					const startDir = entries(start.doors).reduce<Direction | null>((acc, [dir, room]) => room ? acc : dir, null)!
					app.enable('dungeon', {
						direction: otherDirection[startDir],
						dungeon: start,
						dungeonLevel: 0,
						firstEntry: true,
						playerHealth: PLAYER_DEFAULT_HEALTH,
						weapon: player.weapon.weaponName,
					})
					doorsQuery.remove(door)
				}
			}
		}
	}
}