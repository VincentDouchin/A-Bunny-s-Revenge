import type { QueryEntity } from '@/global/entity'
import type { AppStates, Resources, UpdateSystem } from '@/lib/app'
import { farmDoors } from '@/global/entity'
import { ecs, save, tweens, world } from '@/global/init'
import { playSound } from '@/global/sounds'
import { app } from '@/global/states'
import { Direction, isCardinalDirection, otherDirection } from '@/lib/directions'
import { doorClosed } from '@/particles/doorClosed'
import vertexShader from '@/shaders/glsl/main.vert?raw'
import { VineGateMaterial } from '@/shaders/materials'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { genDungeon, RoomType } from '../dungeon/generateDungeon'

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

const doorQuery = ecs.with('collider', 'door', 'rotation')
const playerQuery = ecs.with('collider', 'playerControls', 'currentHealth', 'position').without('ignoreDoor')
const doorToLockQuery = doorQuery.with('doorLocked')
const doorToUnlockQuery = doorQuery.without('doorLocked', 'unlocked')
const unlockVineDoorsQuery = doorQuery.with('unlocked', 'doorType').where(e => e.doorType === 'vine')

const onCollideWithDoor = <S extends AppStates<typeof app>>(

	fn: (
		door: QueryEntity<typeof doorQuery>,
		player: QueryEntity<typeof playerQuery>,
		resources: Resources<typeof app, S>
	) => void,
) => (resources: Resources<typeof app, S>) => {
	{
		for (const door of doorQuery) {
			for (const player of playerQuery) {
				if (world.intersectionPair(door.collider, player.collider)) {
					fn(door, player, resources)
				}
			}
		}
	}
}
export const unlockDoorDungeon: UpdateSystem<typeof app, 'dungeon'> = (resources) => {
	if (doorToLockQuery.size > 0 && resources.dungeon.enemies.length === 0) {
		for (const door of doorToLockQuery) {
			ecs.removeComponent(door, 'doorLocked')
		}
		playSound('zapsplat_multimedia_game_tone_twinkle_bright_collect_gain_level_up_50730')
	}
}

export const collideWithDoorDungeon = onCollideWithDoor<'dungeon'>((door, player, { dungeon, dungeonLevel, weapon }) => {
	if (isCardinalDirection(door.door)) {
		const nextRoom = dungeon.doors[door.door]
		if (nextRoom) {
			app.disable('dungeon')
			app.enable('dungeon', { dungeon: nextRoom, direction: otherDirection[door.door], playerHealth: player.currentHealth, firstEntry: false, dungeonLevel, weapon })
		} else {
			app.enable('farm', { door: 'clearing' })
		}
	} else {
		app.enable('farm', { door: door.door ?? 'clearing' })
	}
})

export const collideWithDoorCamp = onCollideWithDoor(({ door }) => {
	if (door === 'clearing') {
		app.enable('clearing')
	}
	if (door === 'village') {
		app.enable('village', { door: 'village' })
	}
})

export const collideWithDoorVillage = onCollideWithDoor(() => {
	app.enable('farm', { door: 'village' })
})

export const collideWithDoorClearing = onCollideWithDoor((door, player) => {
	if (door.doorLevel !== undefined && player.weapon) {
		const dungeon = genDungeon(7 + door.doorLevel * 5, true, door.doorLevel).find(room => room.type === RoomType.Entrance)!
		app.enable('dungeon', { dungeon, direction: Direction.S, firstEntry: true, playerHealth: player.currentHealth, dungeonLevel: door.doorLevel, weapon: player.weapon.weaponName })
	}
	if (door.doorLevel === undefined) {
		app.enable('farm', { door: 'clearing' })
	}
})

export const collideWithDoorIntro = onCollideWithDoor(({ door }) => {
	if (farmDoors.includes(door)) {
		app.enable('farm', { door: door as typeof farmDoors[number] })
	}
})
const doorClearingQuery = doorQuery.with('doorLevel')
const playerWithWeaponQuery = playerQuery.with('weapon')

export const unlockDoorClearing = () => playerWithWeaponQuery.onEntityAdded.subscribe(() => {
	for (const door of doorClearingQuery) {
		if (door.doorLevel <= save.unlockedPaths) {
			ecs.removeComponent(door, 'doorLocked')
		}
	}
})

const playerInDoor = ecs.with('playerControls', 'ignoreDoor', 'collider')
export const allowDoorCollision: UpdateSystem<typeof app, 'dungeon'> = () => {
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
	if (e.doorType === 'fog') {
		ecs.update(e, { emitter: doorClosed() })
	}
})
export const unlockDoors = () => doorToUnlockQuery.onEntityAdded.subscribe((e) => {
	e.collider.setSensor(true)

	if (e.doorType === 'vine') {
		const vinesBottom = e.model?.getObjectByName('GATE')
		if (vinesBottom) {
			playSound('zapsplat_foley_tree_palm_front_dead_large_dry_movement_ground_001_99605', { playbackRate: 1.5 })
			const initialPosition = vinesBottom.position.y
			tweens.add({
				from: 0,
				to: 1,
				duration: 5000,
				onUpdate: (f) => {
					vinesBottom.position.y = initialPosition - 30 * f
					vinesBottom.traverse((node) => {
						if (node instanceof Mesh && node.material instanceof VineGateMaterial) {
							node.material.uniforms.time.value = f * 2
							node.material.depthWrite = false
						}
					})
				},
			})
		}
	}
	if (e.emitter) {
		e.emitter.system.looping = false
	}
})

const hideVinesDoors = () => unlockVineDoorsQuery.onEntityAdded.subscribe((e) => {
	e.collider.setSensor(true)
	const vinesBottom = e.model?.getObjectByName('GATE')
	if (vinesBottom) {
		vinesBottom.position.y -= 30
	}
})
export const doorLocking = [lockDoors, unlockDoors, hideVinesDoors]
