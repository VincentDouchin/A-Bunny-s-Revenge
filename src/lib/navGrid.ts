import { Cuboid } from '@dimforge/rapier3d-compat'
import { AStarFinder } from 'astar-typescript'
import type { Vec2 } from 'three'
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'

import { Direction } from './directions'
import { getGameRenderGroup } from '@/debug/debugUi'
import { ecs, world } from '@/global/init'
import { memo } from '@/utils/mapFunctions'

class NavPoint extends Vector3 {
	spawnPoint: boolean
	valid = true
	constructor(coords: { x: number, y: number, z: number }, public gridCoord: { x: number, y: number }, spawnPoint: boolean = true) {
		super(coords.x, coords.y, coords.z)
		this.spawnPoint = spawnPoint
	}
}
const RESOLUTION = 5

const doorsQuery = ecs.with('door', 'position')

const getValidSpawnPoints = (points: NavPoint[]) => {
	const [valid, invalid] = [true, false].map(valid => new Set(points.filter(p => p.valid === valid)))
	for (const validPoint of valid) {
		for (const invalidPoint of invalid) {
			if (validPoint.distanceTo(invalidPoint) < 15) {
				validPoint.spawnPoint = false
			}
		}
		for (const door of doorsQuery) {
			const isCloseToDoor = validPoint.distanceTo(door.position) < 60
			const isNorth = door.door === Direction.N && validPoint.z > door.position.z
			const isSouth = door.door === Direction.S && validPoint.z < door.position.z
			const isEast = door.door === Direction.E && validPoint.x < door.position.x
			const isWest = door.door === Direction.W && validPoint.x > door.position.x
			if (isCloseToDoor || isNorth || isSouth || isEast || isWest) {
				validPoint.spawnPoint = false
			}
		}
	}
}
export class NavGrid {
	matrixMap: Array<Array<NavPoint | null>> = []
	// inverseMatrix = new Map<NavPoint, { x: number, y: number }>()
	aStar: AStarFinder
	mesh?: InstancedMesh
	constructor(matrix: Array<Array<NavPoint | null>>) {
		this.matrixMap = matrix
		this.aStar = new AStarFinder({
			grid: {
				matrix: matrix.map(l => l.map(p => p ? 0 : 1)),
			},
			includeStartNode: false,
		})
	}

	static fromLevel(levelSize: { x: number, y: number }) {
		const matrixMap: Array<Array<NavPoint>> = []
		world.step()
		const rot = new Quaternion()
		const shape = new Cuboid(4, 1, 4)
		for (let x = 0; x < levelSize.x / RESOLUTION; x++) {
			for (let y = 0; y < levelSize.y / RESOLUTION; y++) {
				const adjustedX = x * RESOLUTION
				const adjustedY = y * RESOLUTION

				const navPoint = new NavPoint({
					x: adjustedX - levelSize.x / 2,
					y: 2,
					z: levelSize.y / 2 - adjustedY,
				}, {
					x,
					y,
				})

				matrixMap[y] ??= []
				const c = world.intersectionWithShape(navPoint, rot, shape, undefined, undefined, undefined, undefined)
				matrixMap[y][x] = navPoint
				if (c) {
					navPoint.valid = false
				}
			}
		}

		getValidSpawnPoints(matrixMap.flat(2))
		const matrix = matrixMap.map(l => l.map(p => p.valid ? p : null))
		return new NavGrid(matrix)
	}

	static deserialize(data: Array<Array<null | [number, number, number, number, boolean]>>) {
		const matrix = data.map(l => l.map((p) => {
			if (p) {
				return new NavPoint({ x: p[0], y: 2, z: p[1] }, { x: p[2], y: p[3] }, p[4])
			}
			return null
		}))
		return new NavGrid(matrix)
	}

	serialize(): Array<Array<null | [number, number, number, number, boolean]>> {
		return this.matrixMap.map((line) => {
			return line.map((point) => {
				if (point) {
					return [point.x, point.z, point.gridCoord.x, point.gridCoord.y, point.spawnPoint]
				}
				return null
			})
		})
	}

	render(render: boolean) {
		if (!this.mesh) {
			this.mesh = new InstancedMesh(new SphereGeometry(1), new MeshBasicMaterial(), this.points.length)
			for (let i = 0; i < this.points.length; i++) {
				const matrix = new Matrix4()
				const navPoint = this.points[i]
				if (navPoint) {
					matrix.setPosition(navPoint)
					this.mesh.setMatrixAt(i, matrix)
					this.mesh.setColorAt(i, new Color(navPoint.valid ? (navPoint.spawnPoint ? 0x00FF00 : 0xFFFF00) : 0xFF0000))
				}
			}
		}
		if (render && this.mesh) {
			const { scene } = getGameRenderGroup()
			scene.add(this.mesh)
		}
		if (!render && this.mesh) {
			this.mesh.removeFromParent()
		}
	}

	get points() {
		return this.matrixMap.flat(2)
	}

	get spawnPoints() {
		return this.points.filter(p => p?.spawnPoint).filter(Boolean)
	}

	findClosest = memo((x: number, y: number) => {
		let closest: NavPoint | null = null
		let dist = Number.POSITIVE_INFINITY
		for (const point of this.points.filter(p => p)) {
			if (point) {
				const distanceToPoint = new Vector3(x, 2, y).distanceTo(point)
				if (distanceToPoint < dist) {
					dist = distanceToPoint
					closest = point
				}
			}
		}
		if (closest) {
			return closest.gridCoord
		}
	})

	findClosestPoint(position: Vector3) {
		return this.findClosest(position.x, position.z)
	}

	findPathMemo = memo((from: Vec2, to: Vec2) => {
		return this.aStar.findPath(from, to)
	})

	findPath(fromPosition: Vector3, toPosition: Vector3) {
		const [from, to] = [fromPosition, toPosition].map(p => this.findClosestPoint(p))
		if (!from || !to) return
		const path = this.findPathMemo(from, to)
		const next = path[0]
		if (next) return this.matrixMap[next[1]][next[0]]
	}
}