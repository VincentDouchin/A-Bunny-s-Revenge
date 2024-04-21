import { Cuboid } from '@dimforge/rapier3d-compat'
import { AStarFinder } from 'astar-typescript'
import type { Vec2 } from 'three'
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector2, Vector3 } from 'three'

import type { Level } from '@/debug/LevelEditor'
import { getGameRenderGroup } from '@/debug/debugUi'
import { ecs, world } from '@/global/init'
import { memo } from '@/utils/mapFunctions'

class NavPoint extends Vector3 {
	valid = true
	spawnPoint = true
}
const RESOLUTION = 5

const doorsQuery = ecs.with('door', 'position')
export class NavGrid {
	size: Vector2
	points: NavPoint[] = []
	matrixMap: Array<Array<NavPoint>> = []
	inverseMatrix = new Map<NavPoint, { x: number, y: number }>()
	aStar: AStarFinder
	mesh?: InstancedMesh
	spawnPoints: Set<NavPoint>
	constructor(level: Level) {
		this.size = new Vector2(level.size.x, level.size.y)
		for (let x = 0; x < level.size.x / RESOLUTION; x++) {
			for (let y = 0; y < level.size.y / RESOLUTION; y++) {
				const adjustedX = x * RESOLUTION
				const adjustedY = y * RESOLUTION

				const navPoint = new NavPoint(adjustedX - level.size.x / 2, 2, level.size.y / 2 - adjustedY)

				this.points.push(navPoint)

				this.matrixMap[y] ??= []
				this.matrixMap[y][x] = navPoint
				this.inverseMatrix.set(navPoint, { y, x })
			}
		}

		world.step()
		const rot = new Quaternion()
		const shape = new Cuboid(4, 1, 4)
		for (const navPoint of this.points) {
			const c = world.intersectionWithShape(navPoint, rot, shape, undefined, undefined, undefined, undefined)
			if (c) {
				navPoint.valid = false
			}
		}
		this.aStar = this.generateAStar()
		this.spawnPoints = this.getValidSpawnPoints()
	}

	render(render: boolean) {
		if (!this.mesh) {
			this.mesh = new InstancedMesh(new SphereGeometry(1), new MeshBasicMaterial(), this.points.length)
			for (let i = 0; i < this.points.length; i++) {
				const matrix = new Matrix4()
				const navPoint = this.points[i]
				matrix.setPosition(navPoint)
				this.mesh.setMatrixAt(i, matrix)
				this.mesh.setColorAt(i, new Color(navPoint.valid ? this.spawnPoints.has(navPoint) ? 0xFFFF00 : 0x00FF00 : 0xFF0000))
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

	generateAStar() {
		return new AStarFinder({
			grid: {
				matrix: this.matrixMap.map(l => l.map(p => p.valid ? 0 : 1)),
			},
			includeStartNode: false,
		})
	}

	findClosest = memo((x: number, y: number) => {
		let closest: NavPoint | null = null
		let dist = Number.POSITIVE_INFINITY
		for (const point of this.points.filter(p => p.valid)) {
			const distanceToPoint = new Vector3(x, 2, y).distanceTo(point)
			if (distanceToPoint < dist) {
				dist = distanceToPoint
				closest = point
			}
		}
		if (closest) {
			return this.inverseMatrix.get(closest)
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

	getValidSpawnPoints() {
		const [valid, invalid] = [true, false].map(valid => new Set(this.points.filter(p => p.valid === valid)))
		for (const validPoint of valid) {
			for (const invalidPoint of invalid) {
				if (validPoint.distanceTo(invalidPoint) < 15) {
					valid.delete(validPoint)
				}
			}
			for (const door of doorsQuery) {
				const isCloseToDoor = validPoint.distanceTo(door.position) < 60
				const isNorth = door.door === 'north' && validPoint.z > door.position.z
				const isSouth = door.door === 'south' && validPoint.z < door.position.z
				const isEast = door.door === 'east' && validPoint.x < door.position.x
				const isWest = door.door === 'west' && validPoint.x > door.position.x
				if (isCloseToDoor || isNorth || isSouth || isEast || isWest) {
					valid.delete(validPoint)
				}
			}
		}
		return valid
	}
}