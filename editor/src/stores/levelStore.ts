import { loadImage } from '@/global/assetLoaders'
import { getGrass, setDisplacement } from '@/states/game/spawnTrees'
import { imgToCanvas } from '@/utils/buffer'
import { useLocalStorage } from '@vueuse/core'
import { createStore, del, entries, get, set, setMany } from 'idb-keyval'
import { NavMesh } from 'navcat'
import { defineStore } from 'pinia'
import { WebGLRenderer } from 'three'
import { FullScreenQuad } from 'three/addons'
import { BufferGeometry, CanvasTexture, Group, Matrix4, Mesh, Object3D, Quaternion, ShaderMaterial, Vector3, Raycaster, MeshBasicNodeMaterial, Texture } from 'three/webgpu'
import type { WatchHandle } from 'vue'
import { computed, ref, watchEffect } from 'vue'
import FastNoiseLiteSrc from '../lib/FastNoiseLite.glsl?raw'
import { createLevelFolder, deleteFile, loadImageFile, loadLevel, loadLevels, removeLevel, saveLevelFile, saveLevelImage } from '../lib/fileOperations'
import { generateNavMesh, getMesh, NavMeshVisualizer } from '../lib/navMesh'
import type { LevelData, LevelEntity, MapNames } from '../types'
import { DOWN } from '@/constants/vectors'

const strToSeed = (str: string) => str.split('').reduce((acc, v) => acc + v.charCodeAt(0) - 73, 0)

export type EditorLevel = Omit<LevelData, 'entities' | 'instancess'>

export const useLevelStore = defineStore('level', () => {
	const selectedEntityId = ref<string | null>(null)
	const levels = ref<string[]>([])
	const maps: MapNames[] = ['grassMap', 'heightMap', 'pathMap', 'treeMap', 'waterMap', 'grassNoise'] as const
	const selectedLevel = useLocalStorage<null | string>('selectedLevel', null)
	const levelImages = ref<Partial<Record<MapNames, HTMLCanvasElement>>>({})
	const levelEntities = shallowReactive<Record<string, Ref<LevelEntity, LevelEntity>>>({})
	const levelData = ref<Omit<LevelData, 'entities'> | null>(null)
	const key = computed(() => `level-${selectedLevel.value}`)
	const navMesh = shallowRef<NavMesh | null>(null)
	const init = async () => {
		levels.value = (await loadLevels()).map((l) => l.name)
	}

	const imagesStore = (level: string) => createStore(`${level}-images`, 'images')
	const entityStore = (level: string) => createStore(`${level}-entities`, 'entities')
	const instancesStore = (level: string) => createStore(`${level}-instances`, 'instances')

	watch(navMesh, () => {
		set(`navmesh-${selectedLevel.value}`, navMesh.value)
	})
	const initDb = async (level: string) => {
		if (!(await get(`data-${level}`))) {
			const levelLoaded = await loadLevel(level)
			if (levelLoaded.entities) {
				await setMany(Object.entries(levelLoaded.entities), entityStore(level))
			}
			if (levelLoaded.instances) {
				await setMany(Object.entries(levelLoaded.instances), instancesStore(level))
			}
			if (levelLoaded.navMesh) {
				await set(`navmesh-${level}`, levelLoaded.navMesh)
			}
			delete (levelLoaded as any).entities
			delete (levelLoaded as any).instances
			delete (levelLoaded as any).treeMap
			delete (levelLoaded as any).pathMap
			delete (levelLoaded as any).heightMap
			delete (levelLoaded as any).waterMap
			delete (levelLoaded as any).grassMap
			delete (levelLoaded as any).navMesh
			await set(`data-${level}`, levelLoaded)
		}
	}
	watchDebounced(
		levelData,
		() => {
			if (selectedLevel.value) {
				set(`data-${selectedLevel.value}`, toRaw(levelData.value))
			}
		},
		{ deep: true, debounce: 1000 },
	)
	const saveImage = async (canvas: HTMLCanvasElement, map: MapNames) => {
		const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
		set(map, blob, imagesStore(selectedLevel.value!))
	}
	watchDebounced(
		levelImages,
		async () => {
			for (const map in levelImages.value) {
				const mapName = map as MapNames
				await saveImage(levelImages.value[mapName]!, mapName)
			}
		},
		{ debounce: 1000 },
	)

	const saveImageDebounced = useDebounceFn(saveImage, 1000)

	const fetchMapFromFile = async (level: string, map: MapNames) => {
		const img = await loadImageFile(level, map)
		if (img) {
			const canvas = imgToCanvas(img).canvas
			levelImages.value[map] = canvas
			saveImage(canvas, map)
		}
	}

	const fetchLevelImages = async (level: string) => {
		const images = await entries(imagesStore(level))
		levelImages.value = {}
		if (images.length === 0) {
			for (const map of maps) {
				fetchMapFromFile(level, map)
			}
		} else {
			for (const [key, blob] of images) {
				const url = URL.createObjectURL(blob)
				const img = await loadImage(url)
				levelImages.value[key as MapNames] = imgToCanvas(img).canvas
			}
		}
	}
	const getNavMesh = (level: string) => get(`navmesh-${level}`)

	const getEntities = async (level: string) => {
		return (await entries<string, LevelEntity>(entityStore(level))).reduce<Record<string, LevelEntity>>((acc, [key, val]) => {
			acc[key] = val
			return acc
		}, {})
	}
	const getLevelData = (level: string) => get(`data-${level}`)

	const fetchLevel = async (level: string) => {
		await initDb(level)
		await fetchLevelImages(level)
		const data = await getLevelData(level)
		const savedEntities = await getEntities(level)
		navMesh.value = await getNavMesh(level)
		for (const id in levelEntities) {
			delete levelEntities[id]
		}
		const entities = Object.keys(savedEntities).length === 0 ? data.entities : savedEntities
		for (const id in entities) {
			levelEntities[id] = ref(entities[id])
		}

		levelData.value = data
	}
	const rollback = async () => {
		if (!selectedLevel.value) return
		await del(`level-${selectedLevel.value}`)
		fetchLevel(selectedLevel.value)
	}
	const destroy = async () => {
		if (!selectedLevel.value) return
		const level = selectedLevel.value

		// Stop all entity watch handles before clearing entities
		for (const id in wacthHandles) {
			wacthHandles[id]()
			delete wacthHandles[id]
		}

		// Clear all IndexedDB stores for this level
		const [imageEntries, entityEntries, instanceEntries] = await Promise.all([entries(imagesStore(level)), entries(entityStore(level)), entries(instancesStore(level))])
		await Promise.all([
			...imageEntries.map(([k]) => del(k, imagesStore(level))),
			...entityEntries.map(([k]) => del(k, entityStore(level))),
			...instanceEntries.map(([k]) => del(k, instancesStore(level))),
			del(`data-${level}`),
			del(`navmesh-${level}`),
			del(key.value),
		])

		// Clear in-memory reactive state
		levelImages.value = {}
		for (const id in levelEntities) {
			delete levelEntities[id]
		}
		levelData.value = null
		navMesh.value = null
		navMeshHelper.value = null
		groundGeometry.value = null
		groundMesh.value = null

		// Remove the level from the filesystem and levels list
		await removeLevel(level)
		levels.value = levels.value.filter((l) => l !== level)

		// Deselect the level last so watchers don't trigger a re-fetch
		selectedLevel.value = null
	}
	const resetMap = async (map: MapNames) => {
		await del(map, imagesStore(selectedLevel.value!))
		await fetchMapFromFile(selectedLevel.value!, map)
	}
	const destroyMap = async (map: MapNames) => {
		await deleteFile(selectedLevel.value!, `${map}.png`, null)
		await del(map, imagesStore(selectedLevel.value!))
		delete levelImages.value[map]
	}

	watchDebounced(
		levelData,
		(val) => {
			if (val) {
				set(key.value, toRaw(val))
			}
		},
		{ debounce: 1000, deep: true },
	)
	const wacthHandles: Record<string, WatchHandle> = {}
	// Watch for entities being added/removed
	watchArray(
		() => Object.keys(levelEntities),
		(_val, _old, added, removed) => {
			if (!selectedLevel.value) return
			const store = entityStore(selectedLevel.value)
			for (const id of added) {
				wacthHandles[id] = watch(
					levelEntities[id],
					(state) => {
						set(id, toRaw(state), store)
					},
					{ deep: true },
				)
			}

			for (const id of removed ?? []) {
				wacthHandles[id]()
				delete wacthHandles[id]
				del(id, store)
			}
		},
		{ immediate: true },
	)

	watchEffect(() => {
		if (selectedLevel.value) {
			fetchLevel(selectedLevel.value)
		}
	})
	const renderer = new WebGLRenderer()

	const grassNoise = computed(() => {
		if (levelData.value?.floorTexture !== 'grass' || !selectedLevel.value) return
		renderer.setSize(levelData.value.sizeX * 10, levelData.value.sizeY * 10)
		const quad = new FullScreenQuad(
			new ShaderMaterial({
				vertexShader: /* glsl */ `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
				gl_Position = projectionMatrix * modelViewPosition;
			}`,
				fragmentShader: /* glsl */ `
			${FastNoiseLiteSrc}
			varying vec2 vUv;
			void main() {
				fnl_state noise = fnlCreateState(${strToSeed(selectedLevel.value)});
				noise.noise_type = FNL_NOISE_CELLULAR;
				noise.frequency = 0.02;
				noise.cellular_return_type = FNL_CELLULAR_RETURN_TYPE_CELLVALUE;
				noise.domain_warp_type = FNL_DOMAIN_WARP_OPENSIMPLEX2;
				noise.domain_warp_amp = 100.;
				noise.fractal_type = FNL_FRACTAL_DOMAIN_WARP_INDEPENDENT;
				float x = vUv.x * ${levelData.value.sizeX}.;
				float y = vUv.y * ${levelData.value.sizeY}.;
				fnlDomainWarp2D(noise, x, y);
				noise.frequency = 0.015;
				float n = fnlGetNoise2D(noise, x, y);
				n = (n *0.5)+0.5;
				gl_FragColor = vec4(vec3(n),1.);
			}
			`,
			}),
		)
		quad.render(renderer)
		return renderer.domElement
	})

	const groundGeometry = shallowRef<BufferGeometry | null>(null)

	const setGroundGeometry = () => {
		if (levelData.value) {
			groundGeometry.value = setDisplacement(
				{ x: levelData.value.sizeX, y: levelData.value.sizeY },
				levelImages.value?.heightMap ?? null,
				levelImages.value?.waterMap ?? null,
				levelData.value.displacementScale,
			)
		}
	}

	watchEffect(setGroundGeometry)

	const pathTexture = computed(() => (levelImages.value.pathMap ? new CanvasTexture(levelImages.value.pathMap) : undefined))
	const destroyEntity = (id: string) => {
		if (selectedEntityId.value === id) {
			selectedEntityId.value = null
		}
		delete levelEntities[id]
	}
	const save = async (localDir: string | null) => {
		if (!selectedLevel.value || !levelImages.value) return
		await createLevelFolder(selectedLevel.value, localDir)
		const entities = await getEntities(selectedLevel.value)
		const levelData = await getLevelData(selectedLevel.value)
		levelData.entities = entities
		levelData.instances = useTreeStore().treeInstances
		for (const name of maps) {
			await deleteFile(selectedLevel.value, `${name}.png`, localDir)
		}
		for (const name in levelImages.value) {
			const canvas = levelImages.value[name as MapNames]
			if (canvas) {
				await saveLevelImage(selectedLevel.value, name, canvas, localDir)
			}
		}
		if (levelImages.value.grassMap) {
			levelData.grass = getGrass(
				levelImages.value.heightMap ?? null,
				levelImages.value.grassMap,
				levelImages.value.waterMap ?? null,
				levelImages.value.pathMap ?? null,
				2,
				levelData.displacementScale,
			).map(({ position, scale }) => [position.x, position.y, position.z, scale])
		}
		await saveLevelFile(selectedLevel.value, levelData, localDir)
	}

	const navMeshHelper = shallowRef<NavMeshVisualizer | null>(null)
	watchEffect(() => {
		if (navMesh.value) {
			navMeshHelper.value = new NavMeshVisualizer(navMesh.value)
			const ray = new Raycaster(new Vector3(navMeshAnchor.value.x, 100, navMeshAnchor.value.y), DOWN, 1, 200)
			navMeshHelper.value.floodFill(ray)
		} else {
			navMeshHelper.value = null
		}
	})

	const groundMesh = shallowRef<Object3D | null>(null)

	const entitiesBoundaryMeshes = computed(() => {
		const group = new Group()
		const meshes: Mesh<BufferGeometry>[] = []
		for (const id in levelEntities) {
			const data = levelEntities[id].value
			const matrix = new Matrix4().compose(new Vector3().fromArray(data.position), new Quaternion().fromArray(data.rotation), new Vector3().fromArray(data.scale))
			const bb = modelDataStore.modelData?.[data.category]?.[data.model]
			const model = assetStore.models[data.category][data.model]
			console.log(data.model)
			getMesh(bb, matrix, model).forEach((mesh) => {
				group.add(mesh)
				meshes.push(mesh)
			})
		}
		return { group, meshes }
	})

	const modelDataStore = useModelDataStore()
	const treeStore = useTreeStore()
	const assetStore = useAssetStore()
	const anchorName = computed(() => `anchor-${selectedLevel.value}`)
	const navMeshAnchor = useLocalStorage(anchorName, { x: 0, y: 0 })
	const addNavMesh = async () => {
		const meshes: Mesh<BufferGeometry>[] = [toRaw(groundMesh.value) as any, ...treeStore.boundaryMeshes.meshes, ...entitiesBoundaryMeshes.value.meshes]
		console.log(meshes)
		navMesh.value = generateNavMesh(meshes)
	}

	const moveAnchor = ref(false)
	const displayed = useLocalStorage('displayed', {
		tags: true,
		grass: true,
		trees: true,
		boundary: true,
		colliders: true,
		navMesh: true,
	})

	const mouseMaterial = new MeshBasicNodeMaterial({ transparent: true, map: new Texture() })
	const mouseMesh = computed(() => (groundGeometry.value ? new Mesh(groundGeometry.value, mouseMaterial) : null))

	return {
		selectedEntityId,
		levels,
		init,
		selectedLevel,
		levelData,
		levelImages,
		grassNoise,
		rollback,
		groundGeometry,
		setGroundGeometry,
		levelEntities,
		pathTexture,
		destroyEntity,
		saveImage,
		saveImageDebounced,
		resetMap,
		destroyMap,
		save,
		groundMesh,
		addNavMesh,
		navMesh,
		navMeshHelper,
		entitiesBoundaryMeshes,
		displayed,
		navMeshAnchor,
		moveAnchor,
		mouseMaterial,
		mouseMesh,
		destroy,
	}
})
