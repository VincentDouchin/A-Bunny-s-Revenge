import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { RoomType } from '../dungeon/dungeonTypes'
import { ecs, world } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { campState, dungeonState, genDungeonState } from '@/global/states'
import { otherDirection } from '@/lib/directions'
import type { System } from '@/lib/state'
import vertexShader from '@/shaders/glsl/main.vert?raw'

const getDoorLayer = (opacity: number) => {
	const sizeFactor = (3 - opacity) / 3
	const mesh = new Mesh(
		new BoxGeometry(30, 30 * sizeFactor),
		new MeshStandardMaterial({ color: 0x000000, opacity: opacity / 10, transparent: true, side: DoubleSide }),
	)
	mesh.renderOrder = -1
	mesh.material.depthWrite = false
	return mesh
}
export const doorGroup = () => {
	const group = new Group()
	for (let i = 0.1; i <= 1; i += 0.02) {
		const layer = getDoorLayer(i)
		layer.position.z = 0.5 + i * 50
		group.add(layer)
	}
	group.position.y = 15
	return group
}
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
const doorQuery = ecs.with('collider', 'door')
const playerQuery = ecs.with('collider', 'playerControls').without('ignoreDoor')
export const collideWithDoor: System<DungeonRessources> = ({ dungeon }) => {
	for (const door of doorQuery) {
		for (const player of playerQuery) {
			if (world.intersectionPair(door.collider, player.collider)) {
				const nextRoom = dungeon.doors[door.door]
				if (nextRoom) {
					dungeonState.enable({ dungeon: nextRoom, direction: otherDirection[door.door] })
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