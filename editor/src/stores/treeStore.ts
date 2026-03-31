import type { Matrix4, QuaternionLike, Vector3Like } from 'three'
import type { InstancedMesh } from 'three/webgpu'
import type { ColliderData, InstanceData, InstanceEntity, LevelEntity } from '../types'
import type { Direction } from '@/lib/directions'
import { defineStore } from 'pinia'
import { SkeletonUtils } from 'three/addons'
import { Box2, CanvasTexture, Group, Quaternion, Vector2, Vector3 } from 'three/webgpu'
import { InstancedModel } from '@/global/assetLoaders'
import { getGrassModel, getTrees } from '@/states/game/spawnTrees'
import { buildTreeBoundaryGrid, isInBoundaryCell, mergeGrids, visualizeGrid } from '../lib/treeOptimizer'

export const useTreeStore = defineStore('trees', () => {
	const levelStore = useLevelStore()
	const modelDataStore = useModelDataStore()
	const assetStore = useAssetStore()
	const treeModels = ['Low_Poly_Forest_treeTall01', 'Low_Poly_Forest_treeTall02', 'Low_Poly_Forest_treeTall03', 'Low_Poly_Forest_treeTall04'] as const
	const getTreeData = (i: number, position: Vector3Like) => {
		const collider = modelDataStore.modelData.trees[treeModels[i]].collider as ColliderData & { type: 'cylinder' }
		const radius = collider.size.x
		return {
			position,
			radius,
		}
	}
	interface Trees {
		instances: {
			position: Vector3Like
			rotation: QuaternionLike
			scale: Vector3Like
			matrix: Matrix4
			transparent: boolean
		}[][]
		data: {
			position: Vector3Like
			radius: number
		}[]
	}
	const trees = ref<Trees | null>(null)

	const getTreesData = () => {
		if (!levelStore.levelImages?.treeMap || !levelStore.levelData) return { instances: [], data: [] }
		const instances = getTrees(treeModels.length, levelStore.levelImages?.heightMap ?? null, levelStore.levelImages.treeMap, 10, levelStore.levelData.displacementScale)
		const data = instances.flatMap((trees, i) => trees.map((t) => getTreeData(i, t.position)))
		trees.value = { instances, data }
	}

	watchEffect(getTreesData)

	const getDoorBoundaries = (e: LevelEntity) => {
		const halfSize = new Vector3().fromArray(e.scale).multiplyScalar(0.5).applyQuaternion(new Quaternion().fromArray(e.rotation))
		const p = new Vector3().fromArray(e.position)
		const min = new Vector2(p.x - Math.abs(halfSize.x), p.z - Math.abs(halfSize.z))
		const max = new Vector2(p.x + Math.abs(halfSize.x), p.z + Math.abs(halfSize.z))

		return new Box2(min, max)
	}
	const showBoundaryGrid = ref(false)
	const getBoundaryGrid = () => {
		const treeDataValue = trees.value?.data
		if (!treeDataValue || !levelStore.levelData) return null
		const size = new Vector2(levelStore.levelData.sizeX, levelStore.levelData.sizeY)
		const gridData = buildTreeBoundaryGrid(treeDataValue, size, 8)
		const doorGrids = Object.values(levelStore.levelEntities)
			.filter((e) => e.value.tags?.doorDungeon)
			.map((e) => {
				const box = getDoorBoundaries(e.value)
				const treesWithDoor = treeDataValue.filter((t) => !box.containsPoint(new Vector2(t.position.x, t.position.z)))
				return {
					direction: e.value.tags?.doorDungeon,
					grid: buildTreeBoundaryGrid(treesWithDoor, size, 8),
					box,
				}
			})
		const data = mergeGrids(gridData, ...doorGrids.map((dg) => dg.grid))
		const obj = visualizeGrid(data)
		return { data, obj, doorGrids }
	}

	const boundaryGrid = computed(() => {
		if (showBoundaryGrid.value) {
			return getBoundaryGrid()
		}
		return null
	})

	const getTreesInstances = (boundaryGrid: ReturnType<typeof getBoundaryGrid> | null = null) => {
		const treesValue = trees.value
		if (!treesValue) return null
		const instances: Record<string, InstanceData> = {}
		for (let i = 0; i < treeModels.length; i++) {
			if (!treesValue.instances[i]?.length) continue
			const modelName = treeModels[i]

			instances[modelName] ??= {
				category: 'trees',
				model: modelName,
				entities: [],
			}

			for (const tree of treesValue.instances[i]) {
				const treeData = getTreeData(i, tree.position)
				const treePoint = new Vector2(tree.position.x, tree.position.z)
				const entity: InstanceEntity = {
					position: tree.position,
					rotation: tree.rotation,
					scale: tree.scale,
					transparent: tree.transparent,
					collider: false,
				}
				if (boundaryGrid) {
					entity.collider = isInBoundaryCell(treeData.position, treeData.radius, boundaryGrid.data)
					entity.doorDungeon = boundaryGrid.doorGrids.find((d) => d.box.containsPoint(treePoint))?.direction as Direction
				}
				instances[modelName].entities.push(entity)
			}
		}

		return instances
	}

	const treeInstances = computed(() => getTreesInstances(boundaryGrid.value))

	const treesModels = computed(() => {
		const treesValue = trees.value
		if (!treesValue || !treeInstances.value || !assetStore.assets) return null

		const newTreeGroup = new Group()
		for (let i = 0; i < treeModels.length; i++) {
			if (!treesValue.instances[i]?.length) continue
			const modelName = treeModels[i]

			const instancedModel = new InstancedModel(SkeletonUtils.clone((assetStore.assets.trees[modelName] as any).scene))
			for (const tree of treesValue.instances[i]) {
				instancedModel.addInstance(tree.matrix)
			}
			newTreeGroup.add(instancedModel.build())
		}
		return newTreeGroup
	})
	const grassModel = ref<InstancedMesh | null>(null)

	const setGrassModel = () => {
		if (!assetStore.assets || !levelStore.grassNoise || !levelStore.levelImages.grassMap || !levelStore.levelData) {
			grassModel.value = null
		} else {
			grassModel.value = getGrassModel(
				assetStore.assets.textures.grass,
				new CanvasTexture(levelStore.grassNoise),
				{
					heightMap: levelStore.levelImages.heightMap,
					grassMap: levelStore.levelImages.grassMap,
					waterMap: levelStore.levelImages.waterMap,
					pathMap: levelStore.levelImages.pathMap,
				},
				levelStore.levelData.displacementScale,
				{ x: levelStore.levelData.sizeX, y: levelStore.levelData.sizeY },
			)
		}
	}
	watchEffect(setGrassModel)
	return { trees, treesModels, boundaryGrid, getTreesData, grassModel, setGrassModel, treeInstances }
})
