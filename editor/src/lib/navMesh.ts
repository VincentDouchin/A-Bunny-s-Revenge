import { vec3toRaw } from '@/utils/mapFunctions'
import type { NavMesh, NodeRef } from 'navcat'
import { getNodeByTileAndPoly, getNodeRefIndex } from 'navcat'
import type { SoloNavMeshInput, SoloNavMeshOptions } from 'navcat/blocks'
import { floodFillNavMesh, generateSoloNavMesh, mergePositionsAndIndices } from 'navcat/blocks'
import type { DebugObject } from 'navcat/three'
import { createNavMeshPolyHelper } from 'navcat/three'
import { type BufferAttribute } from 'three'
import type { Matrix4, Object3D, Raycaster, Scene } from 'three/webgpu'
import { BoxGeometry, BufferGeometry, CapsuleGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, SphereGeometry, Vector3 } from 'three/webgpu'
import type { AssetData } from '../types'

const _position = new Vector3()

export const getPositionsAndIndices = (meshes: Mesh[]): [positions: number[], indices: number[]] => {
	const toMerge: {
		positions: ArrayLike<number>
		indices: ArrayLike<number>
	}[] = []

	for (const mesh of meshes) {
		const positionAttribute = mesh.geometry.attributes.position as BufferAttribute

		if (!positionAttribute || positionAttribute.itemSize !== 3) {
			continue
		}

		mesh.updateMatrixWorld()

		const positions = new Float32Array(positionAttribute.count * 3)

		for (let i = 0; i < positionAttribute.count; i++) {
			const pos = _position.fromBufferAttribute(positionAttribute, i)
			mesh.localToWorld(pos)
			const indx = i * 3
			positions[indx] = pos.x
			positions[indx + 1] = pos.y
			positions[indx + 2] = pos.z
		}

		let indices: ArrayLike<number> | undefined = mesh.geometry.getIndex()?.array

		if (indices === undefined) {
			// this will become indexed when merging with other meshes
			const ascendingIndex: number[] = []
			for (let i = 0; i < positionAttribute.count; i++) {
				ascendingIndex.push(i)
			}
			indices = ascendingIndex
		}

		toMerge.push({
			positions,
			indices,
		})
	}
	console.log(toMerge)
	return mergePositionsAndIndices(toMerge)
}

export const generateNavMesh = (obj: Mesh<BufferGeometry>[]) => {
	// generation input
	const [positions, indices] = getPositionsAndIndices(obj)

	const input: SoloNavMeshInput = {
		positions,
		indices,
	}

	// generation options
	const cellSize = 0.15
	const cellHeight = 0.15

	const walkableRadiusWorld = 5
	const walkableRadiusVoxels = Math.ceil(walkableRadiusWorld / cellSize)
	const walkableClimbWorld = 0.5
	const walkableClimbVoxels = Math.ceil(walkableClimbWorld / cellHeight)
	const walkableHeightWorld = 0.25
	const walkableHeightVoxels = Math.ceil(walkableHeightWorld / cellHeight)
	const walkableSlopeAngleDegrees = 45

	const borderSize = 0
	const minRegionArea = 8
	const mergeRegionArea = 20

	const maxSimplificationError = 1.3
	const maxEdgeLength = 12

	const maxVerticesPerPoly = 5

	const detailSampleDistanceVoxels = 6
	const detailSampleDistance = detailSampleDistanceVoxels < 0.9 ? 0 : cellSize * detailSampleDistanceVoxels

	const detailSampleMaxErrorVoxels = 1
	const detailSampleMaxError = cellHeight * detailSampleMaxErrorVoxels

	const options: SoloNavMeshOptions = {
		cellSize,
		cellHeight,
		walkableRadiusWorld,
		walkableRadiusVoxels,
		walkableClimbWorld,
		walkableClimbVoxels,
		walkableHeightWorld,
		walkableHeightVoxels,
		walkableSlopeAngleDegrees,
		borderSize,
		minRegionArea,
		mergeRegionArea,
		maxSimplificationError,
		maxEdgeLength,
		maxVerticesPerPoly,
		detailSampleDistance,
		detailSampleMaxError,
	}

	// generate a navmesh
	// const worker = new NavMeshWorker()
	// worker.postMessage({ input, options })
	// worker.onmessage = ({ data }) => {
	// 	res(JSON.parse(data) as NavMesh)
	// }
	const res = generateSoloNavMesh(input, options)
	return res.navMesh
	// const intermediates = result.intermediates // intermediate data for debugging

	// visualize the navmesh in threejs

	// // find a path
	// const start: Vec3 = [-4, 0, -4]
	// const end: Vec3 = [4, 0, 4]
	// const halfExtents: Vec3 = [0.5, 0.5, 0.5]

	// const path = findPath(navMesh, start, end, halfExtents, DEFAULT_QUERY_FILTER)

	// console.log(
	// 	'path:',
	// 	path.path.map(p => p.position),
	// )

	// // visualise the path points
	// for (const point of path.path) {
	// 	const sphere = new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({ color: 0xFF0000 }))
	// 	sphere.position.set(point.position[0], point.position[1], point.position[2])
	// 	scene.add(sphere)
	// }

	// // visualise the A* search nodes
	// if (path.nodePath) {
	// 	const searchNodesHelper = createSearchNodesHelper(path.nodePath.nodes)
	// 	scene.add(searchNodesHelper.object)
	// }
}

const mat = new MeshBasicNodeMaterial({
	color: 0xff0000,
	// transparent: true,
	// opacity: 0.2,
})
export const getMesh = (boundingBox: AssetData | undefined, matrix: Matrix4, model: Object3D) => {
	const collider = boundingBox?.collider
	if (collider && collider.type === 'trimesh') {
		const meshes: Mesh[] = []

		model.updateWorldMatrix(true, true)

		model.traverse((object) => {
			if (object instanceof Mesh && object.geometry instanceof BufferGeometry) {
				const geometry = object.geometry.clone()
				geometry.applyMatrix4(object.matrixWorld)
				const mesh = new Mesh(geometry, mat)
				mesh.applyMatrix4(matrix)
				meshes.push(mesh)
			}
		})

		return meshes
	}
	if (!boundingBox || !collider || collider.type === 'link') return []

	let geo: BufferGeometry

	switch (collider.type) {
		case 'ball':
			geo = new SphereGeometry(0.5, 6, 6)
			break
		case 'capsule':
			geo = new CapsuleGeometry(0.5, 1, 6, 6, 6)
			break
		case 'cuboid':
			geo = new BoxGeometry()
			break
		case 'cylinder':
			geo = new CylinderGeometry(0.5, 0.5, 1, 6)
			break
	}

	/* -----------------------------
	   Rebuild the SAME hierarchy
	------------------------------ */

	const mesh = new Mesh(geo!, mat)

	mesh.position.y = collider.type === 'capsule' ? 1 : 0.5

	const group = new Group()
	group.scale.copy(vec3toRaw(collider.size))
	group.position.copy(vec3toRaw(collider.position))
	group.add(mesh)

	const group2 = new Group()
	group2.add(group)

	group2.applyMatrix4(matrix)

	const globalScale = new Vector3().fromArray(boundingBox.scale ?? [1, 1, 1])
	group2.scale.multiply(globalScale)

	/* -----------------------------
	   Bake world transform
	------------------------------ */

	group2.updateWorldMatrix(true, true)

	const bakedMatrix = mesh.matrixWorld.clone()

	mesh.geometry.applyMatrix4(bakedMatrix)

	/* -----------------------------
	   Detach & reset mesh
	------------------------------ */

	mesh.position.set(0, 0, 0)
	mesh.rotation.set(0, 0, 0)
	mesh.scale.set(1, 1, 1)
	mesh.updateMatrixWorld(true)

	return [mesh]
}

export function findClickedPolygon(raycaster: Raycaster, navMesh: NavMesh): NodeRef | null {
	let closestDistance = Infinity
	let closestPolyRef: NodeRef | null = null

	// Check all polygons in all tiles
	for (const tile of Object.values(navMesh.tiles)) {
		for (let polyIndex = 0; polyIndex < tile.polys.length; polyIndex++) {
			const poly = tile.polys[polyIndex]

			// Create a temporary geometry for this polygon
			const vertices: number[] = []
			const indices: number[] = []

			// Get polygon vertices
			for (let i = 0; i < poly.vertices.length; i++) {
				const vertIndex = poly.vertices[i] * 3
				vertices.push(
					tile.vertices[vertIndex],
					tile.vertices[vertIndex + 1] + 0.1, // Slightly elevated
					tile.vertices[vertIndex + 2],
				)
			}

			// Triangulate polygon (simple fan triangulation)
			for (let i = 1; i < poly.vertices.length - 1; i++) {
				indices.push(0, i, i + 1)
			}

			// Create temporary geometry
			const geometry = new BufferGeometry()
			geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
			geometry.setIndex(indices)

			// Create temporary mesh
			const material = new MeshBasicMaterial()
			const mesh = new Mesh(geometry, material)

			// Test intersection
			const intersects = raycaster.intersectObject(mesh)

			if (intersects.length > 0 && intersects[0].distance < closestDistance) {
				closestDistance = intersects[0].distance
				closestPolyRef = getNodeByTileAndPoly(navMesh, tile, polyIndex).ref
			}

			// Clean up
			geometry.dispose()
			material.dispose()
		}
	}

	return closestPolyRef
}

function floodFillPruneNavMesh(navMesh: NavMesh, startNodeRefs: NodeRef[]) {
	// flood fill from startRefs to find reachable and unreachable polygons
	const { unreachable } = floodFillNavMesh(navMesh, startNodeRefs)

	// disable unreachable polygons
	for (const nodeRef of unreachable) {
		const nodeIndex = getNodeRefIndex(nodeRef)
		const node = navMesh.nodes[nodeIndex]

		// disable the poly by setting its node's flags to 0
		node.flags = 0

		// also set the flag in the source tile data, useful if we want to persist the tile
		const tile = navMesh.tiles[node.tileId]
		const polyIndex = node.polyIndex
		tile.polys[polyIndex].flags = 0
	}
}
// poly visuals
interface PolyHelper {
	helper: DebugObject
	nodeRef: NodeRef
}

const polyHelpers = new Map<NodeRef, PolyHelper>()
const setPolyColor = (polyRef: NodeRef, color: number, transparent: boolean, opacity: number): void => {
	const helperInfo = polyHelpers.get(polyRef)
	if (!helperInfo) return

	helperInfo.helper.object.traverse((child: any) => {
		if (child instanceof Mesh && child.material) {
			const materials = Array.isArray(child.material) ? child.material : [child.material]

			materials.forEach((mat) => {
				if ('color' in mat) {
					mat.color.setHex(color)
					mat.transparent = transparent
					mat.opacity = opacity
				}
			})
		}
	})
}
const clearPolyHelpers = (scene: Scene): void => {
	for (const helperInfo of polyHelpers.values()) {
		scene.remove(helperInfo.helper.object)
		helperInfo.helper.dispose()
	}
	polyHelpers.clear()
}
const createPolyHelpers = (scene: Scene, navMesh: NavMesh): void => {
	// create helpers for all polygons in the navmesh
	for (const tileId in navMesh.tiles) {
		const tile = navMesh.tiles[tileId]
		for (let polyIndex = 0; polyIndex < tile.polys.length; polyIndex++) {
			const node = getNodeByTileAndPoly(navMesh, tile, polyIndex)

			const helper = createNavMeshPolyHelper(navMesh, node.ref, [0.3, 0.8, 0.3])

			// initially visible with normal appearance
			helper.object.position.y += 0.1 // adjust height for visibility
			scene.add(helper.object)

			polyHelpers.set(node.ref, {
				helper,
				nodeRef: node.ref,
			})
		}
	}
}
export function updateNavMeshVisualization(scene: Scene, navMesh: NavMesh) {
	// clear existing helpers
	clearPolyHelpers(scene)

	// create poly helpers
	createPolyHelpers(scene, navMesh)

	// if pruned, update colors
	for (const tileId in navMesh.tiles) {
		const tile = navMesh.tiles[tileId]
		for (let polyIndex = 0; polyIndex < tile.polys.length; polyIndex++) {
			const polyRef = getNodeByTileAndPoly(navMesh, tile, polyIndex).ref
			const poly = tile.polys[polyIndex]

			if (poly.flags === 0) {
				setPolyColor(polyRef, 0xff0000, true, 0) // red, semi-transparent
			} else {
				setPolyColor(polyRef, 0xff0000, false, 1.0) // green, opaque
			}
		}
	}
}

export class NavMeshVisualizer extends Group {
	private polyHelpers = new Map<NodeRef, PolyHelper>()

	constructor(private navMesh: NavMesh) {
		super()
		this.update()
	}

	update(): void {
		this.clear()
		this.createPolyHelpers()
		this.applyFlags()
	}

	floodFill(ray: Raycaster): void {
		const clicked = findClickedPolygon(ray, this.navMesh)
		console.log(clicked)
		if (!clicked) return
		floodFillPruneNavMesh(this.navMesh, [clicked])
		this.update()
	}

	dispose(): void {
		this.clear()
	}

	private createPolyHelpers(): void {
		for (const tileId in this.navMesh.tiles) {
			const tile = this.navMesh.tiles[tileId]
			for (let polyIndex = 0; polyIndex < tile.polys.length; polyIndex++) {
				const node = getNodeByTileAndPoly(this.navMesh, tile, polyIndex)
				const helper = createNavMeshPolyHelper(this.navMesh, node.ref, [0.3, 0.8, 0.3])
				helper.object.position.y += 0.1
				this.add(helper.object)
				this.polyHelpers.set(node.ref, { helper, nodeRef: node.ref })
			}
		}
	}

	applyFlags(): void {
		for (const tileId in this.navMesh.tiles) {
			const tile = this.navMesh.tiles[tileId]
			for (let polyIndex = 0; polyIndex < tile.polys.length; polyIndex++) {
				const polyRef = getNodeByTileAndPoly(this.navMesh, tile, polyIndex).ref
				const poly = tile.polys[polyIndex]
				if (poly.flags === 0) {
					this.setPolyColor(polyRef, 0xff0000, true, 0)
				} else {
					this.setPolyColor(polyRef, 0x0000ff, false, 1.0)
				}
			}
		}
	}

	clear() {
		for (const { helper } of this.polyHelpers.values()) {
			this.remove(helper.object)
			helper.dispose()
		}
		this.polyHelpers.clear()
		return super.clear()
	}

	private setPolyColor(polyRef: NodeRef, color: number, transparent: boolean, opacity: number): void {
		const helperInfo = this.polyHelpers.get(polyRef)
		if (!helperInfo) return
		helperInfo.helper.object.traverse((child: any) => {
			if (child instanceof Mesh && child.material) {
				const mats = Array.isArray(child.material) ? child.material : [child.material]
				mats.forEach((mat) => {
					if ('color' in mat) {
						mat.color.setHex(color)
						mat.transparent = transparent
						mat.opacity = opacity
					}
				})
			}
		})
	}
}
