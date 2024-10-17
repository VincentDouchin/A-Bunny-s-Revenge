import { ecs, world } from '@/global/init'
import { scene } from '@/global/rendering'
import { Cuboid } from '@dimforge/rapier3d-compat'
import { AStarFinder } from 'astar-typescript'
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, type Vec2, Vector2, Vector3 } from 'three'
import { Direction } from './directions'

const RESOLUTION = 5
export enum NavCell {
	Wall,
	Walkable,
	Spawnpoint,
}
const doorsQuery = ecs.with('door', 'position')

// this.matrix.forEach((l, y) => {
// 	l.forEach((c, x) => {
// 		const isInPath = path?.some(p => p[0] === x && p[1] === y)
// 		const isStartOrEnd = [start, end].some(p => p.x === x && p.y === y)
// 		b.fillStyle = isInPath ? 'blue' : isStartOrEnd ? 'white' : c === Cell.Walkable ? 'green' : c === Cell.Wall ? 'yellow' : 'red'
// 		b.fillRect(x * RESOLUTION, y * RESOLUTION, RESOLUTION, RESOLUTION)
// 	})
// })

// const b = getScreenBuffer(500, 500)
// document.body.appendChild(b.canvas)
// b.canvas.style.position = 'fixed'
export class NavGrid {
	astar: AStarFinder
	closestNodes: Vec2[][] = []
	constructor(public matrix: NavCell[][], public size: Vec2) {
		this.astar = new AStarFinder({
			grid: {
				matrix: matrix.map(l => l.map(c => c === NavCell.Wall ? 1 : 0)),
			},
			includeStartNode: false,
			includeEndNode: false,
		})
		matrix.forEach((l, y) => {
			l.forEach((c, x) => {
				if (c === NavCell.Wall) {
					let closest: Vec2 | null = null
					let dist = Infinity
					matrix.forEach((l2, y2) => {
						l2.forEach((c2, x2) => {
							const nDist = new Vector2(x, y).distanceTo({ x: x2, y: y2 })
							if (c2 !== NavCell.Wall && nDist < dist) {
								dist = nDist
								closest = { x: x2, y: y2 }
							}
						})
					})
					if (closest) {
						this.closestNodes[y] ??= []
						this.closestNodes[y][x] = closest
					}
				}
			})
		})
	}

	static fromLevel(size: Vec2) {
		const shape = new Cuboid(5, 1, 5)
		const rot = new Quaternion()
		const matrix: NavCell[][] = []

		for (let y = 0; y < size.y / RESOLUTION; y++) {
			matrix[y] = []
			for (let x = 0; x < size.x / RESOLUTION; x++) {
				const p = new Vector3(size.x / 2 - x * RESOLUTION, 2, size.y / 2 - y * RESOLUTION)
				const c = world.intersectionWithShape(p, rot, shape, undefined, undefined, undefined, undefined)
				if (c) {
					matrix[y][x] = NavCell.Wall
				} else {
					matrix[y][x] = NavCell.Walkable
				}
			}
		}
		return new NavGrid(matrix, size).setSpawnPoints()
	}

	getSpawnPoints() {
		return this.matrix.flatMap((l, y) => l.map((c, x) => c === NavCell.Spawnpoint ? this.gridToWorld({ x, y }) : null).filter(Boolean))
	}

	setSpawnPoints() {
		const [valid, notValid] = [NavCell.Walkable, NavCell.Wall].map((type) => {
			return this.matrix.flatMap((l, y) => {
				return l.map((c, x) => c === type ? new Vector2(x, y) : null).filter(Boolean)
			})
		})
		const spawnPoints = new Set(valid)
		for (const validPoint of valid) {
			const worldPos = this.gridToWorld(validPoint)
			for (const invalidPoint of notValid) {
				if (worldPos.distanceTo(this.gridToWorld(invalidPoint)) < 15) {
					spawnPoints.delete(validPoint)
				}
			}
			for (const door of doorsQuery) {
				const isCloseToDoor = worldPos.distanceTo(door.position) < 60
				const isNorth = door.door === Direction.N && worldPos.z > door.position.z
				const isSouth = door.door === Direction.S && worldPos.z < door.position.z
				const isEast = door.door === Direction.E && worldPos.x < door.position.x
				const isWest = door.door === Direction.W && worldPos.x > door.position.x
				if (isCloseToDoor || isNorth || isSouth || isEast || isWest) {
					spawnPoints.delete(validPoint)
				}
			}
		}
		for (const { x, y } of spawnPoints) {
			this.matrix[y][x] = NavCell.Spawnpoint
		}
		return this
	}

	gridToWorld({ x, y }: Vec2) {
		return new Vector3(this.size.x / 2 - x * RESOLUTION, 2, this.size.y / 2 - y * RESOLUTION)
	}

	worldToGrid(pos: Vector3) {
		return new Vector2(this.size.x, this.size.y).divideScalar(2).sub(new Vector2(pos.x, pos.z)).divideScalar(RESOLUTION).floor()
	}

	mesh?: InstancedMesh
	render() {
		const mesh = new InstancedMesh(new SphereGeometry(1), new MeshBasicMaterial(), this.matrix.flat().length)
		scene.add(mesh)
		this.matrix.forEach((l, y) => {
			l.forEach((c, x) => {
				const index = y * l.length + x
				const matrix = new Matrix4()
				matrix.setPosition(this.gridToWorld({ x, y }))
				mesh.setColorAt(index, new Color(c === NavCell.Wall ? 0xFF0000 : c === NavCell.Walkable ? 0x00FF00 : 0xFFFF00))
				mesh.setMatrixAt(index, matrix)
			})
		})
		this.mesh = mesh
	}

	findPath(from: Vector3, to: Vector3) {
		const [start, end] = [from, to].map(p => this.worldToGrid(p)).map(({ x, y }) => this.closestNodes?.[y]?.[x] ?? { x, y })
		try {
			const path = this.astar.findPath(start, end)
			const next = path?.[0]
			if (next) {
				return this.gridToWorld({ x: next[0], y: next[1] })
			}
		} catch (e) {
			console.error(e)
		}
	}
}