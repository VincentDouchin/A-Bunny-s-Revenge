import { InstancedModel } from '@/global/assetLoaders'
import type { loadAssets } from '@/global/assets'
import type { Tags } from '@assets/tagsList'
import { init, World } from '@dimforge/rapier3d-compat'
import { faArrowsRotate, faArrowsUpDownLeftRight, faEarth, faLocationArrow, faLock, faLockOpen, faMaximize } from '@fortawesome/free-solid-svg-icons'
import { trackDeep } from '@solid-primitives/deep'
import { debounce, throttle } from '@solid-primitives/scheduled'
import { makePersisted } from '@solid-primitives/storage'
import { Event } from 'eventery'
import { get, set } from 'idb-keyval'
import type { NavMesh } from 'navcat'
import Fa from 'solid-fa'
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'
import { createMutable, modifyMutable, reconcile, unwrap } from 'solid-js/store'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import type { BufferGeometry, Material, Object3D, Vec2 } from 'three'
import { AmbientLight, CanvasTexture, GridHelper, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshToonMaterial, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from 'three'
import { CSS2DObject, CSS2DRenderer, MapControls, OrbitControls, SkeletonUtils, TransformControls } from 'three-stdlib'
import { generateUUID } from 'three/src/math/MathUtils.js'
import { RapierDebugRenderer } from '../../src/lib/debugRenderer'
import type { ThumbnailRenderer } from '../../src/lib/thumbnailRenderer'
import { GroundMaterial, WaterMaterial } from '../../src/shaders/materials'
import { getTrees, setDisplacement } from '../../src/states/game/spawnTrees'
import { Configuration } from './components/Configuration'
import { EntitySelector } from './components/EntitiySelector'
import { EntityList } from './components/EntityList'
import { EntityProps } from './components/EntityProps'
import { LevelProps } from './components/LevelProps'
import { LevelSelector } from './components/LevelSelector'
import { MapEditor } from './components/MapEditor'
import { RangeInput } from './components/RangeInput'
import { Renderer } from './components/Renderer'
import type { AnchorX, AnchorY } from './components/ResizeModal'
import { SelectedEntityProps } from './components/SelectedEntityProps'
import { TagsEditor } from './components/TagsEditor'
import { createFolder, isRepoCloned, loadBoundingBox, loadLevel, loadLevels, loadTagsList, saveBoundingBox, saveLevelFile, saveTagsList } from './lib/fileOperations'
import { floodFill, generateNavMesh, getMesh } from './lib/navMesh'
import type { AssetData, EditorTags, InstanceData, LevelData, LevelEntity } from './types'

export const BOUNDING_BOX_FILE_PATH = 'assets/boundingBox.json'
await init()
export function Editor({ entities, thumbnailRenderer, assets }: {
	entities: Record<string, Record<string, Object3D>>
	thumbnailRenderer: ThumbnailRenderer
	assets: Awaited<ReturnType<typeof loadAssets>>
}) {
	const boundingBox = createMutable<Record<string, Record<string, AssetData>>>({})
	const loaded = atom(false)
	const loading = atom(false)
	const floorTexture = atom<'planks' | 'grass' | null>(null)
	const folder = 'A-Bunny-s-Revenge'

	const tagsList = atom<EditorTags>({})

	const [mode, setMode] = makePersisted(createSignal<'level' | 'entity'>('level'))
	const renderer = new WebGLRenderer({ alpha: true })
	const cssRenderer = new CSS2DRenderer()
	renderer.domElement.classList.add('renderer', 'level-renderer')
	cssRenderer.domElement.classList.add('renderer', 'css-renderer')
	renderer.setClearColor(0x222222)
	const scene = new Scene()
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	const orbitControls = new OrbitControls(camera, renderer.domElement)
	const mapControls = new MapControls(camera, renderer.domElement)
	const world = new World({ x: 0, y: 0, z: 0 })

	const levelEntitiesData = createMutable<Record<string, LevelEntity>>({})
	const instances = createMutable<Record<string, InstanceData>>({})
	const levelEntities: Record<string, Object3D> = {}
	const tagsContainers = createMutable<Record<string, CSS2DObject>>({})
	const selectedId = atom<string | null>(null)

	const t = new TransformControls<PerspectiveCamera>(camera, renderer.domElement)
	const transformControlsMode = atom<'translate' | 'scale' | 'rotate'>('translate')

	const displacementScale = atom<number | null>(null)

	const heightCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const heightMap = atom<string>('')

	const treeCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const treeMap = atom<string>('')

	const pathCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const pathMap = atom<string>('')

	const waterCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const waterMap = atom<string>('')

	const grassCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const grassMap = atom<string>('')
	let treeGroup: Object3D | null = null
	// let grassGroup: Object3D | null = null
	onCleanup(() => {
		renderer.dispose()
		thumbnailRenderer.dispose()
	})

	const redrawEvent = new Event()

	const debugRenderer = new RapierDebugRenderer(world)
	scene.add(debugRenderer)

	const selectedCategory = atom<string | null>(null)
	const selectedAsset = atom<string | null>(null)
	const model = createMemo(() => {
		const category = selectedCategory()
		const asset = selectedAsset()
		if (category && asset) {
			return entities[category]?.[asset]
		}
		return null
	})
	const levels = atom<string[]>([])
	const selectedLevel = atom<string | null>(null)
	const levelSize = atom<Vector2 | null>(null)

	const tempModel = atom<Object3D | null>(null)

	const repetitions: Record<string, Record<string, Object3D>> = {}

	const group = new Group()
	const helperGroup = new Group()
	scene.add(helperGroup)
	const groundMaterial = new MeshStandardMaterial({ transparent: true, opacity: 0 })
	const groundGeometry = new PlaneGeometry(1, 1)
	const groundMesh = new Mesh<BufferGeometry, Material>(groundGeometry, groundMaterial)
	groundMesh.rotation.set(-Math.PI / 2, 0, 0)
	const waterMesh = new Mesh<BufferGeometry, Material>(new PlaneGeometry(1, 1), new MeshStandardMaterial({ color: 0x0000FF }))
	const pointerMesh = new Mesh(groundGeometry, new MeshBasicMaterial({ transparent: true, opacity: 0 }))
	groundMesh.add(pointerMesh, waterMesh)
	groundMesh.add(new Mesh(new SphereGeometry(1), new MeshBasicMaterial({ color: 0xFF0000 })))
	pointerMesh.renderOrder = -10
	group.add(groundMesh, new AmbientLight(0xFFFFFF, 1))
	const getGlobalScale = (id: string) => {
		const entity = levelEntitiesData[id]
		return new Vector3(...(boundingBox?.[entity.category]?.[entity.model]?.scale ?? [1, 1, 1]))
	}
	let prevModel: Object3D | null = null

	const tags = atom<Partial<Tags>>({})
	const localTags = atom<Partial<Tags>>({})
	createEffect(on(selectedId, (id) => {
		if (id) {
			const entity = levelEntitiesData[id]
			const globalTags = boundingBox?.[entity.category]?.[entity.model]?.tags
			tags(globalTags ?? {})
			localTags(entity.tags ?? {})
		} else {
			tags({})
			localTags({})
		}
	}))
	createEffect(on(tags, (tagsValue) => {
		const id = selectedId()
		if (id) {
			const entity = levelEntitiesData[id]
			boundingBox[entity.category] ??= {}
			boundingBox[entity.category][entity.model] ??= {}
			boundingBox[entity.category][entity.model].tags = tagsValue
		}
	}))
	createEffect(on(localTags, (localTagsValue) => {
		const id = selectedId()
		if (id) {
			const entity = levelEntitiesData[id]
			entity.tags = localTagsValue
		}
	}))

	const openEditor = atom<null | string>(null)
	const drawing = atom<boolean>(false)
	createEffect<'level' | 'entity'>((prev) => {
		if (mode() === 'entity' && prev !== 'entity') {
			tempModel(null)
			selectedLevel(null)
			scene.clear()
			orbitControls.enabled = true
			mapControls.enabled = false
			scene.add(new AmbientLight(0xFFFFFF, 1))
			camera.position.set(0, 10, 5)
			scene.add(debugRenderer)
			t.detach()

			const grid = new GridHelper(10, 10)
			scene.add(grid)
			camera.lookAt(new Vector3())
		}
		if (mode() === 'entity') {
			prevModel?.removeFromParent()
			prevModel = model()
			if (prevModel) {
				scene.add(prevModel)
			}
		}
		return mode()
	}, mode())
	let isGrounding = false

	const groundEntity = (id: string | null) => {
		if (isGrounding) return // Prevent recursive calls

		const scale = displacementScale()
		if (id && levelEntities[id] && levelEntitiesData[id].grounded && scale) {
			isGrounding = true // Set flag

			const pos = levelEntities[id].position
			const ray = new Raycaster(pos.clone().add(new Vector3(0, 1000, 0)), new Vector3(0, -1, 0), 1, 2000)
			const intersection = ray.intersectObject(groundMesh)?.[0]
			if (intersection) {
				levelEntities[id].position.setY(intersection.point.y)
			}
			for (const repetition of Object.values(repetitions?.[id] ?? {})) {
				const origin = new Vector3()
				repetition.getWorldPosition(origin)
				origin.setY(1000)
				const ray = new Raycaster(origin, new Vector3(0, -1, 0), 0.1, 2000)
				const int = ray.intersectObject(groundMesh)?.[0]
				if (int) {
					repetition.worldToLocal(int.point)
					repetition.position.setY(int.point.y)
				}
			}

			isGrounding = false // Clear flag
		}
	}

	createEffect(() => {
		const size = levelSize()
		if (size) {
			groundMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
			pointerMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
			waterMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
			const max = Math.max(size.x, size.y)
			camera.position.set(0, max, max / 2)
		}
	})

	const transformControls = new TransformControls(camera, renderer.domElement)

	createEffect(on(
		() => [heightCanvas(), levelSize(), waterCanvas(), displacementScale()],
		() => {
			const canvas = heightCanvas()
			const size = levelSize()
			const wCanvas = waterCanvas()
			const scale = displacementScale()
			if (!canvas || !size || !wCanvas || !scale) return
			groundMesh.geometry = setDisplacement(size, canvas, wCanvas, scale)
			pointerMesh.geometry = setDisplacement(size, canvas, wCanvas, scale)
			groundMesh.position.set(0, -scale / 2, 0)
			waterMesh.position.set(0, 0, scale / 2 - 2)
		},
	))
	const completeNavMesh = atom<NavMesh | null>(null)
	let navMeshHelperObj: Object3D | null = null
	let navMesh: NavMesh | null = null
	const addNavMesh = () => {
		const meshes: Mesh<BufferGeometry>[] = [groundMesh]
		for (const id in levelEntitiesData) {
			const data = levelEntitiesData[id]
			const matrix = new Matrix4().compose(
				new Vector3().fromArray(data.position),
				new Quaternion().fromArray(data.rotation),
				new Vector3().fromArray(data.scale),
			)
			const bb = boundingBox?.[data.category]?.[data.model]

			const mesh = getMesh(bb, matrix)
			if (mesh) {
				helperGroup.add(mesh)
				meshes.push(mesh)
			}
		}
		for (const key in instances) {
			const instance = instances[key]
			for (const matrixArray of instance.entities) {
				const matrix = new Matrix4().fromArray(matrixArray)
				const bb = boundingBox?.[instance.category]?.[instance.model]
				const mesh = getMesh(bb, matrix)
				if (mesh) {
					helperGroup.add(mesh)
					meshes.push(mesh)
				}
			}
		}
		const res = generateNavMesh(meshes)
		navMesh = res.navMesh
		navMeshHelperObj?.removeFromParent()
		navMeshHelperObj = res.navMeshHelper.object
		scene.add(navMeshHelperObj)
	}
	createEffect(on(treeCanvas, (tCanvas) => {
		if (tCanvas) {
			const hCanvas = heightCanvas()
			const scale = displacementScale()
			if (!hCanvas || !scale) return
			const models = [
				'Low_Poly_Forest_treeTall01',
				'Low_Poly_Forest_treeTall02',
				'Low_Poly_Forest_treeTall03',
				'Low_Poly_Forest_treeTall04',
			] as const
			const trees = getTrees(models.length, hCanvas, tCanvas, 10, scale)
			const newTreeGroup = new Group()
			for (let i = 0; i < trees.length; i++) {
				if (!trees[i]) continue
				const modelName = models[i]
				instances[`${modelName}-transparent`] ??= {
					category: 'trees',
					model: modelName,
					entities: [],
					data: { transparent: true },
				}
				instances[modelName] ??= {
					category: 'trees',
					model: modelName,
					entities: [],
				}
				const instancedModel = new InstancedModel(SkeletonUtils.clone((assets.trees[modelName] as any).scene))
				for (const tree of trees[i]) {
					const m4 = new Matrix4().fromArray(tree.matrix.toArray())
					const instanceHandle = instancedModel.addInstance(m4)
					let key = modelName
					if (tree.transparent) {
						instanceHandle.setUniform('transparent', 1)
						key += '-transparent'
					}
					instances[key].entities.push(tree.matrix.toArray())
				}
				newTreeGroup.add(instancedModel.build())
			}

			treeGroup?.removeFromParent()
			treeGroup = newTreeGroup
			group.add(treeGroup)
		}
	}))

	// createEffect(on(grassCanvas, (gCanvas) => {
		// const hCanvas = heightCanvas()
		// const scale = displacementScale()
		// if (!hCanvas || !gCanvas || !scale) return
		// const [grass, flowers] = ['Grass_', 'Flower_'].map(name => Object.entries(entities.vegetation).reduce<Object3D[]>((acc, [modelName, model]) => {
		// 	if (modelName.includes(name)) acc.push(model)
		// 	return acc
		// }, []))
		// const { process } = getGrass(grass, flowers, hCanvas, gCanvas, 5, scale)
		// const newGrassGroup = process()
		// group.add(newGrassGroup)
		// grassGroup?.removeFromParent()
		// grassGroup = newGrassGroup
	// }))
	const getWoodFlooring = ({ x, y }: { x: number, y: number }) => {
		const map = assets.textures.planks
		map.repeat.set(x / 32, y / 32)
		const mat = new MeshToonMaterial({ map })
		return mat
	}
	createEffect(() => {
		const floorTextureValue = floorTexture()
		const size = levelSize()
		const canvas = pathCanvas()
		if (!size || !canvas || !floorTextureValue) return
		const level = new CanvasTexture(canvas)
		switch (floorTextureValue) {
			case 'grass': groundMesh.material = new GroundMaterial().setUniforms({
				level,
				rock: null,
				size: new Vector2(size.x, size.y),
				ground: assets?.textures.Dirt4_Dark,
				rock_texture: assets?.textures.Rocks1_Light,
			})
				break
			case 'planks': groundMesh.material = getWoodFlooring(size)
				break
		}
	})
	createEffect(on(waterCanvas, (canvas) => {
		const size = levelSize()
		if (!size || !canvas) return
		waterMesh.material = new WaterMaterial({ map: new CanvasTexture(canvas) }).setUniforms({ size, time: 1 })
	}))

	;(t as any).addEventListener('axis-changed', (e: { value: string }) => {
		mapControls.enabled = e.value === null && mode() === 'level'
		orbitControls.enabled = e.value === null && mode() === 'entity'

		const id = selectedId()
		if (e.value === null && id) {
			levelEntitiesData[id].position = levelEntities[id].position.toArray()
			levelEntitiesData[id].scale = levelEntities[id].scale.clone().divide(getGlobalScale(id)).toArray()
			levelEntitiesData[id].rotation = new Quaternion().setFromEuler(levelEntities[id].rotation).toArray()
			groundEntity(id)
		}
	})

	const groundUV = atom<Vector2 | null>(null)

	const mouseRay = new Raycaster()
	const getMousePosition = (e: PointerEvent) => {
		const box = renderer.domElement.getBoundingClientRect()
		if (e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
			return {
				x: ((e.clientX - box.left) / (box.right - box.left)) * 2 - 1,
				y: -((e.clientY - box.top) / (box.bottom - box.top)) * 2 + 1,
			}
		}
		return null
	}
	let mousePosition: null | Vec2 = null
	window.addEventListener('pointermove', (e) => {
		mousePosition = getMousePosition(e)
		drawing(e.ctrlKey)
	})
	const updateTempModelPosition = () => {
		const model = tempModel()
		if (mousePosition) {
			if (model || drawing()) {
				mouseRay.setFromCamera(new Vector2(mousePosition.x, mousePosition.y), camera)
				const intersection = mouseRay.intersectObject(groundMesh)
				if (intersection[0]) {
					if (model) {
						model.visible = true
						model.position.copy(intersection[0].point)
					} else {
						groundUV(new Vector2(intersection[0].uv!.x, 1 - intersection[0].uv!.y))
					}
				}
			}
		}
	}

	createEffect(on(model, (obj) => {
		if (obj && mode() === 'level') {
			tempModel()?.removeFromParent()
			const cloneModel = SkeletonUtils.clone(obj)
			scene.add(cloneModel)
			cloneModel.visible = false
			const category = selectedCategory()
			const asset = selectedAsset()
			if (category && asset) {
				const globalScale = boundingBox?.[category]?.[asset]?.scale
				if (globalScale) {
					cloneModel.scale.multiply(new Vector3(...globalScale))
				}
			}
			tempModel(cloneModel)
		}
	}))

	const onPointerDown = (e: PointerEvent) => {
		const pos = getMousePosition(e)
		if (navMesh && pos) {
			const ray = new Raycaster()
			ray.setFromCamera(new Vector2(pos.x, pos.y), camera)
			group.visible = false
			navMeshHelperObj?.removeFromParent()
			helperGroup.children.forEach(c => c.removeFromParent())
			floodFill(scene, ray, navMesh)
			completeNavMesh(navMesh)
		}
		if (mode() === 'level' && !drawing()) {
			if (e.buttons === 1) {
				const model = tempModel()
				const category = selectedCategory()
				const asset = selectedAsset()
				if (model && category && asset) {
					const entity = SkeletonUtils.clone(model)
					scene.add(entity)
					const id = generateUUID()
					levelEntities[id] = entity

					levelEntitiesData[id] = {
						category,
						model: asset,
						scale: [1, 1, 1],
						position: entity.position.toArray(),
						grounded: true,
						rotation: new Quaternion().setFromEuler(entity.rotation).toArray(),
					}
				} else if (pos && !selectedId()) {
					const ray = new Raycaster()
					ray.setFromCamera(new Vector2(pos.x, pos.y), camera)
					for (const key in levelEntities) {
						const entity = levelEntities[key]
						if (ray.intersectObject(entity, true).length > 0) {
							selectedId(key)
							return
						}
					}
				}
			} else {
				selectedAsset(null)
				selectedId(null)
			}
		}
	}
	createEffect(on(selectedId, (id) => {
		if (!id) {
			t.detach()
		} else {
			const entity = levelEntities[id]
			t.attach(entity)
			transformControlsMode('translate')
			scene.add(t)
			selectedCategory(levelEntitiesData[id].category)
		}
	}))
	const scaleLock = atom(true)
	const changeMode = (e: KeyboardEvent) => {
		if (!selectedId()) return
		switch (e.key) {
			case 'g':return	transformControlsMode('translate')
			case 's':	{
				const id = selectedId()
				if (id) {
					const scale = levelEntitiesData[id].scale
					scaleLock(scale[0] === scale[1] && scale[0] === scale[2])
				}
				transformControlsMode('scale')
				return
			}
			case 'r':return	transformControlsMode('rotate')
		}
	}
	createEffect(() => t.setMode(transformControlsMode()))

	const setMaxScale = () => {
		const t = transformControls as any
		if (t.axis && t.getMode() === 'scale' && scaleLock() && mode() === 'level') {
			const axis = [...t.axis?.toLowerCase()].filter(axis => ['x', 'y', 'z'].includes(axis)) as Array<'x' | 'y' | 'z'>
			const max = Math.max(...axis.map(axis => t.object?.scale[axis] ?? 0))
			t.object?.scale.setScalar(max)
		}
	}
	createEffect(on(scaleLock, setMaxScale))
	t.addEventListener('change', setMaxScale)
	onMount(() => window.addEventListener('keydown', changeMode))
	onCleanup(() => window.removeEventListener('keydown', changeMode))

	createEffect(on(selectedAsset, (asset) => {
		if (!asset) {
			tempModel()?.removeFromParent()
			tempModel(null)
		}
		selectedId(null)
	}))

	const levelData = createMemo<LevelData | null>(() => {
		const size = levelSize()
		const height = heightMap()
		const tree = treeMap()
		const path = pathMap()
		const water = waterMap()
		const grass = grassMap()
		const scale = displacementScale()
		const floorTextureValue = floorTexture()

		trackDeep(levelEntitiesData)
		trackDeep(instances)
		if (size && scale && !loading() && floorTextureValue) {
			return {
				sizeX: size.x,
				sizeY: size.y,
				entities: unwrap(levelEntitiesData),
				displacementScale: scale,
				heightMap: height,
				treeMap: tree,
				pathMap: path,
				waterMap: water,
				grassMap: grass,
				floorTexture: floorTextureValue,
				instances: unwrap(instances),
				navMesh: completeNavMesh(),
			}
		}
		return null
	})

	const updateEntity = (id: string, init = false) => {
		const entityData = levelEntitiesData[id]
		const model = entities?.[entityData.category]?.[entityData.model]
		if (model) {
			let existingEntity = levelEntities[id]
			if (!existingEntity) {
				const model = entities?.[entityData.category]?.[entityData.model]

				const cloned = SkeletonUtils.clone(model)

				const obj = new CSS2DObject(document.createElement('div'))
				tagsContainers[id] = obj
				cloned.add(obj)
				group.add(cloned)

				levelEntities[id] = cloned
				existingEntity = cloned
			}
			existingEntity.position.fromArray(entityData.position)
			existingEntity.rotation.setFromQuaternion(new Quaternion().fromArray(entityData.rotation))

			existingEntity.scale.copy(new Vector3(...entityData.scale).multiply(getGlobalScale(id)))
			if (entityData.grid && (entityData.grid.repetitionX > 0 || entityData.grid.repetitionY > 0)) {
				repetitions[id] ??= {}
				const prevData = repetitions[id]
				const newData: Record<string, Object3D> = {}
				for (let x = 0; x <= entityData.grid.repetitionX; x++) {
					for (let y = 0; y <= entityData.grid.repetitionY; y++) {
						if (!(x === 0 && y === 0)) {
							const key = `${x}-${y}`
							prevData[key] ??= SkeletonUtils.clone(model)
							newData[key] = prevData[key]
							const repetition = newData[key]
							existingEntity.add(repetition)
							repetition.position.set(entityData.grid.spacingX * x, 0, entityData.grid.spacingY * y)
							delete prevData[key]
						}
					}
				}
				Object.values(prevData).forEach(o => o.removeFromParent())
				repetitions[id] = newData
			} else {
				Object.values(repetitions[id] ?? {}).forEach(o => o.removeFromParent())
			}
			if (init) {
				groundEntity(id)
			}
		}
	}

	const removeEntity = (id: string) => {
		selectedId(null)
		levelEntities[id].removeFromParent()
		delete levelEntitiesData[id]
		delete levelEntities[id]
	}

	const fetchLevel = async (levelName: string) => {
		loading(true)

		scene.clear()
		for (const id in levelEntities) {
			removeEntity(id)
		}
		for (const tagContainer of Object.values(tagsContainers)) {
			tagContainer.remove()
		}
		selectedLevel('')
		displacementScale(null)
		heightMap('')
		treeMap('')
		pathMap('')
		waterMap('')
		grassMap('')
		completeNavMesh(null)
		treeCanvas(null)
		heightCanvas(null)
		pathCanvas(null)
		waterCanvas(null)
		grassCanvas(null)
		modifyMutable(instances, reconcile({}))
		modifyMutable(tagsContainers, reconcile({}))
		modifyMutable(levelEntitiesData, reconcile({}))
		const data = await loadLevel(folder, levelName)
		floorTexture(data.floorTexture)
		selectedLevel(levelName)
		displacementScale(data.displacementScale)
		heightMap(data.heightMap)
		treeMap(data.treeMap)
		pathMap(data.pathMap)
		waterMap(data.waterMap)
		grassMap(data.grassMap)
		levelSize(new Vector2(data.sizeX, data.sizeY))
		completeNavMesh(data.navMesh)
		orbitControls.enabled = false
		mapControls.enabled = true
		scene.add(camera)
		camera.lookAt(new Vector3())
		camera.updateProjectionMatrix()
		scene.add(group)

		modifyMutable(levelEntitiesData, reconcile(data.entities))
		setMode('level')
		for (const id in levelEntitiesData) {
			updateEntity(id, false)
		}
		loading(false)
		redrawEvent.emit()
	}

	createEffect(() => {
		if (!openEditor()) {
			drawing(false)
		}
	})
	createEffect(() => {
		if (!drawing()) {
			pointerMesh.material.opacity = 0
		}
	})
	const mouse = (canvas: HTMLCanvasElement | null) => {
		if (canvas) {
			pointerMesh.material.map = new CanvasTexture(canvas)
			pointerMesh.material.opacity = 0.5
		} else {
			pointerMesh.material.opacity = 0
		}
		pointerMesh.material.needsUpdate = true
	}

	const globalMode = atom<'brush' | 'eraser' | null>(null)
	createEffect<boolean>((prev) => {
		if (globalMode()) {
			const wasEnabled = mapControls.enabled
			mapControls.enabled = false
			return wasEnabled
		} else {
			mapControls.enabled = prev
		}
		return prev
	}, mapControls.enabled)

	createEffect(on(drawing, (drawing) => {
		if (drawing) {
			selectedId(null)
			selectedAsset(null)
		}
	}))

	const resetScale = () => {
		const id = selectedId()
		if (id) {
			levelEntities[id].scale.setScalar(1).multiply(getGlobalScale(id))
			levelEntitiesData[id].scale = [1, 1, 1]
		}
	}
	const resetGlobalScale = () => {
		const id = selectedId()
		if (id) {
			const entity = levelEntitiesData[id]
			boundingBox[entity.category][entity.model].scale = [1, 1, 1]
			for (const [otherId, otherEntity] of Object.entries(levelEntitiesData)) {
				if (otherEntity.category === entity.category && otherEntity.model === entity.model) {
					levelEntities[otherId].scale.fromArray(levelEntitiesData[otherId].scale)
				}
			}
		}
	}
	const applyGlobalScale = () => {
		const id = selectedId()

		if (id) {
			const entity = levelEntitiesData[id]
			const model = levelEntities[id]
			const scale = model.scale.clone()
			boundingBox[entity.category] ??= {}
			boundingBox[entity.category][entity.model] ??= {}
			boundingBox[entity.category][entity.model].scale = scale.toArray()
			entity.scale = [1, 1, 1]
			model.scale.setScalar(1)
			for (const [otherId, otherEntity] of Object.entries(levelEntitiesData)) {
				if (otherEntity.category === entity.category && otherEntity.model === entity.model) {
					levelEntities[otherId].scale.copy(new Vector3(...levelEntitiesData[otherId].scale).multiply(getGlobalScale(otherId)))
				}
			}
		}
	}
	const listenToRemoveEntity = (e: KeyboardEvent) => {
		if (e.key === 'Delete') {
			const id = selectedId()
			if (id) removeEntity(id)
		}
	}
	onMount(() => window.addEventListener('keydown', listenToRemoveEntity))
	onCleanup(() => window.removeEventListener('keydown', listenToRemoveEntity))

	const assetInMap = createMemo(() => {
		const id = selectedId()
		if (id) {
			return levelEntitiesData[id].model
		}
		return null
	})

	const hoveredEntity = atom<string | null>(null)

	const saveLevelDebounced = throttle((levelName: string, data: LevelData) => set(levelName, data), 1000)
	const saveLevelLocal = () => {
		const levelName = selectedLevel()
		const data = unwrap(levelData())
		if (levelName && data && loaded()) {
			saveLevelDebounced(levelName, data)
		}
	}
	createEffect(on(levelData, () => {
		saveLevelLocal()
	}))

	const saveLevel = async () => {
		const levelName = selectedLevel()
		if (levelName) {
			const data = await get(levelName)
			const boundingBoxData = await get('boundingBox')
			await saveBoundingBox(folder, boundingBoxData)
			await saveLevelFile(folder, levelName, data)
		}
	}

	const saveBoundingBoxDebounced = debounce(async () => {
		if (loaded()) {
			await set('boundingBox', unwrap(boundingBox))
		}
	}, 500)
	createEffect(() => {
		trackDeep(boundingBox)
		saveBoundingBoxDebounced()
	})
	const saveTagsListfn = (tags: EditorTags) => {
		tagsList(tags)
		saveTagsList(folder, tags)
	}

	const fetchLevels = async (folder: string) => {
		const dirs = await loadLevels(folder) as { name: string }[]
		levels(dirs.filter(x => x.name !== 'data.json').map(x => x.name.replace('.json', '')))
		if (levels().length !== 0) {
			await fetchLevel(levels()[0])
		}
	}
	const fetchBoundingBox = async (folder: string) => {
		let data = await get('boundingBox')
		data ??= await loadBoundingBox(folder)
		modifyMutable(boundingBox, reconcile(data))
	}
	const fetchTagsList = async (folder: string) => {
		const tags = await loadTagsList(folder)
		tagsList(tags)
	}

	const repoCloned = atom(false)
	const reload = async (folder: string) => {
		loaded(false)
		selectedLevel(null)
		for (const id in levelEntities) {
			removeEntity(id)
		}
		scene.clear()
		await createFolder(folder)
		const repo = await isRepoCloned(folder)
		repoCloned(repo)
		if (repo) {
			await fetchBoundingBox(folder)
			await fetchTagsList(folder)
			await fetchLevels(folder)
		}
		loaded(true)
	}

	onMount(() => {
		reload(folder)
	})
	renderer.setAnimationLoop(() => {
		if (mode() === 'entity') {
			world.step()
			debugRenderer?.update()
		}
		updateTempModelPosition()
		renderer.render(scene, camera)
		cssRenderer.render(scene, camera)
	})

	const duplicate = () => {
		const id = selectedId()
		if (id) {
			const clone = structuredClone(unwrap(levelEntitiesData[id]))
			const newId = generateUUID()
			levelEntitiesData[newId] = clone
			updateEntity(newId)
		}
	}
	const getOffsetX = (anchorX: AnchorX, newWidth: number, oldWidth: number) => {
		switch (anchorX) {
			case 'left': return 0
			case 'center': return Math.floor((newWidth - oldWidth) / 2)
			case 'right': return newWidth - oldWidth
		}
	}
	const getOffsetY = (anchorX: AnchorY, newHeight: number, oldHeight: number) => {
		switch (anchorX) {
			case 'top': return 0
			case 'center': return Math.floor((newHeight - oldHeight) / 2)
			case 'bottom': return newHeight - oldHeight
		}
	}
	const resize = (anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vec2) => {
		const oldSize = levelSize()
		if (!oldSize) return
		const tempCanvas = document.createElement('canvas') as HTMLCanvasElement
		tempCanvas.width = size.x
		tempCanvas.height = size.y
		const ctx = tempCanvas.getContext('2d')!
		const offsetX = getOffsetX(anchorX, size.x, oldSize.x)
		const offsetY = getOffsetY(anchorY, size.y, oldSize.y)
		for (const [canvas, map] of [[treeCanvas, treeMap], [pathCanvas, pathMap], [heightCanvas, heightMap], [grassCanvas, grassMap], [waterCanvas, waterMap]] as const) {
			ctx.clearRect(0, 0, size.x, size.y)
			const canvasValue = canvas()
			if (!canvasValue) continue
			if (mode === 'extend') {
				ctx.drawImage(canvasValue, offsetX, offsetY, oldSize.x, oldSize.y)
			} else {
				ctx.drawImage(canvasValue, 0, 0, size.x, size.y)
			}
			canvasValue.width = size.x
			canvasValue.height = size.y
			canvasValue.getContext('2d')!.drawImage(tempCanvas, 0, 0, size.x, size.y)
			canvas(canvasValue)
			map(canvasValue.toDataURL())
		}
		levelSize(new Vector2(size.x, size.y))
		redrawEvent.emit()
		const { x: ow, y: oh } = oldSize
		const { x: nw, y: nh } = size

		const ox = anchorX === 'left' ? 0 : anchorX === 'right' ? nw - ow : (nw - ow) / 2
		const oy = anchorY === 'top' ? 0 : anchorY === 'bottom' ? nh - oh : (nh - oh) / 2

		const ocx = ow / 2
		const ocy = oh / 2
		const ncx = nw / 2
		const ncy = nh / 2
		for (const key in levelEntitiesData) {
			const [x, y, z] = levelEntitiesData[key].position
			if (mode === 'extend') {
				const newX = (x + ocx + ox) - ncx
				const newZ = (z + ocy + oy) - ncy
				levelEntitiesData[key].position = [newX, y, newZ]
			}
			else {
				const sx = nw / ow
				const sy = nh / oh
				const newX = ((x + ocx) * sx) - ncx
				const newZ = ((z + ocy) * sy) - ncy
				levelEntitiesData[key].position = [newX, y, newZ]
			}
			updateEntity(key)
		}
	}

	css/* css */`
	.hidden{
		display: none
	}
	.editor{
		height: calc(100dvh - 1rem);
		padding: 0.5rem;	
		display: grid;
		grid-template-rows: 4fr 1fr
	}
	.top{
		display: grid;
		grid-template-columns: 1fr 5fr 1fr;
		overflow-y: hidden;
		gap:0.5rem;
		margin-bottom: 0.5rem;
	}
	.map-editors{
		height: 100%;
		overflow-y: auto;
	}
	.left{
		height: 100%;
		overflow-y: auto;
	}
	.renderer-container{
		border-radius: 1rem;
		position: relative;
		overflow: hidden;
		border: solid 3px var(--color-2);
		z-index: 0;
	}
	.mode-buttons{
		position: absolute;
		left: 1rem;
		top: 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.scale-buttons{
		display: flex;
		gap: 0.5rem;
	}
	.tag{
		padding: 0 .2rem;
    	font-size: .7rem;
		border-radius:0.1rem;
	}
	.global-tag{
		background: var(--global-tag-color);
	}
	.entity-tag{
		background: var(--entity-tag-color);
	}
	.indicator-arrow{
		color: yellow;
		font-size: 2rem;
		transform: rotate(-45deg);
		position: absolute;
	}
	:global(.indicator-arrow svg) {
		stroke: black;
		stroke-width: 1.5em;
	}
  	`

	return (

		<Show when={Object.keys(entities).length > 0}>
			<div class="editor">
				<div class="top">
					<div class="left">
						<Configuration
							folder={folder}
							reload={reload}
							repoCloned={repoCloned}
							saveLevel={saveLevel}
						/>
						<Show when={!selectedId()}>
							<LevelSelector
								fetchLevels={fetchLevels}
								levels={levels}
								loadLevel={fetchLevel}
								selectedLevel={selectedLevel}
								folder={folder}
							/>
						</Show>
						<Show when={mode() === 'level'}>
							<Show when={!selectedId()}>
								<LevelProps
									addNavMesh={addNavMesh}
									resize={resize}
									levelSize={levelSize}
									floorTexture={floorTexture}
								/>
							</Show>
							<Show when={selectedId() && tagsList()}>
								<TagsEditor tagsList={tagsList} tags={localTags} saveTagsList={saveTagsListfn} global={false}></TagsEditor>
								<TagsEditor tagsList={tagsList} tags={tags} saveTagsList={saveTagsListfn}></TagsEditor>
							</Show>
							<EntityList
								selectedId={selectedId}
								hoveredEntity={hoveredEntity}
								levelEntitiesData={levelEntitiesData}
								removeEntity={removeEntity}
							/>
							<For each={Object.entries(tagsContainers)}>
								{([id, el]) => {
									const entity = levelEntitiesData[id]
									const globalTags = createMemo(() => boundingBox?.[entity.category]?.[entity.model]?.tags ?? {})
									const entityTags = createMemo(() => levelEntitiesData[id]?.tags ?? {})
									return (
										<Portal mount={el.element}>
											<div style="position:relative">
												<Show when={id === hoveredEntity()}>
													<div class="indicator-arrow">
														<Fa icon={faLocationArrow}></Fa>
													</div>
												</Show>
												<For each={Object.entries(globalTags())}>
													{([tag, val]) => (
														<div class="tag global-tag">
															{tag}
															{val === true ? '' : ` ${val}`}
														</div>
													)}
												</For>
												<For each={Object.entries(entityTags())}>
													{([tag, val]) => (
														<div class="tag entity-tag">
															{tag}
															{val === true ? '' : ` ${val}`}
														</div>
													)}
												</For>
											</div>
										</Portal>
									)
								}}
							</For>
						</Show>
						<Show when={mode() === 'entity'}>
							<EntityProps
								scene={scene}
								transformControls={t}
								saveTagsList={saveTagsListfn}
								tagsList={tagsList}
								debugRenderer={debugRenderer}
								transformControlsMode={transformControlsMode}
								boundingBox={boundingBox}
								selectedAsset={selectedAsset}
								selectedCategory={selectedCategory}
								model={model}
								world={world}
								entities={entities}
							/>
						</Show>

					</div>
					<div
						class="renderer-container"
						onPointerDown={e => drawing() && globalMode(e.buttons === 1 ? 'brush' : 'eraser')}
						onPointerLeave={() => {
							groundUV(null)
							globalMode(null)
						}}
						onPointerUp={() => {
							groundUV(null)
							globalMode(null)
						}}
						onContextMenu={e => e.preventDefault()}
					>
						<Renderer renderer={renderer} camera={camera} onPointerDown={onPointerDown} cssRenderer={cssRenderer} />

						<Show when={selectedId() || mode() === 'entity'}>
							<div class="mode-buttons">
								<div class="scale-buttons">
									<button onClick={() => transformControlsMode('scale')} classList={{ selected: transformControlsMode() === 'scale' }}>
										<Fa icon={faMaximize}></Fa>
										{' '}
										(S)
									</button>
									<Show when={selectedId()}>
										<button onClick={() => scaleLock(!scaleLock())}>
											<Fa icon={scaleLock() ? faLock : faLockOpen}></Fa>
											{' '}
											Lock scale axis
										</button>
										<button onClick={applyGlobalScale}>
											<Fa icon={faEarth}></Fa>
											{' '}
											Apply to all
										</button>

									</Show>
								</div>
								<button onClick={() => transformControlsMode('translate')} classList={{ selected: transformControlsMode() === 'translate' }}>
									<Fa icon={faArrowsUpDownLeftRight}></Fa>
									{' '}
									(G)
								</button>
								<button onClick={() => transformControlsMode('rotate')} classList={{ selected: transformControlsMode() === 'rotate' }}>
									<Fa icon={faArrowsRotate}></Fa>
									{' '}
									(R)
								</button>
							</div>
						</Show>
					</div>

					<div class="map-editors">
						<Show when={selectedId()}>
							{(id) => {
								const entity = levelEntitiesData[id()]
								const assetData = boundingBox?.[entity.category]?.[entity.model]
								return (
									<SelectedEntityProps
										duplicate={duplicate}
										assetData={assetData}
										destroy={() => removeEntity(id())}
										entity={levelEntitiesData[id()]}
										update={() => updateEntity(id(), false)}
										applyGlobalScale={applyGlobalScale}
										scaleLock={scaleLock}
										resetScale={resetScale}
										resetGlobalScale={resetGlobalScale}
									/>
								)
							}}
						</Show>
						<Show when={mode() === 'level' && levelSize()}>
							{size => (
								<div classList={{ hidden: Boolean(selectedId()) }}>
									<MapEditor
										redrawEvent={redrawEvent}
										name="Height map"
										drawing={drawing}
										mouseCanvas={mouse}
										dataUrl={heightMap}
										setCanvas={heightCanvas}
										levelSize={size}
										open={openEditor}
										eraseColor="black"
										realTimeUpdate={false}
										globalMode={globalMode}
										globalPosition={groundUV}
									>
										{(color) => {
											const height = atom(1)
											createEffect(() => color(`hsl(0deg,0%,${height()}%)`))
											return (
												<>
													<RangeInput value={height} name="Height" max={100} />
													<RangeInput name="Displacement scale" value={displacementScale} min={0} />
												</>
											)
										}}
									</MapEditor>
									<MapEditor
										redrawEvent={redrawEvent}
										name="Trees"
										drawing={drawing}
										mouseCanvas={mouse}
										dataUrl={treeMap}
										setCanvas={treeCanvas}
										levelSize={size}
										transparency={false}
										blur={false}
										realTimeUpdate={false}
										defaultColor="#00FF00"
										open={openEditor}
										globalMode={globalMode}
										globalPosition={groundUV}
									>
										{(color) => {
											css/* css */`
													.color-buttons{
														display: grid;
														grid-template-columns: 1fr 1fr;
													}
													.square{
														width: 0.8rem;
														aspect-ratio: 1;
														display: inline-block;
														margin-right: 0.2rem;
													}
													.green{
														background: #00FF00
													}
													.red{
														background: #FF0000
													}
													`
											return (
												<div class="color-buttons">
													<button onClick={() => color('#00FF00')} classList={{ selected: color() === '#00FF00' }}>
														<div class="square green" />
														Trees
													</button>
													<button onClick={() => color('#FF0000')} classList={{ selected: color() === '#FF0000' }}>
														<div class="square red" />
														Transparent Trees
													</button>
												</div>
											)
										}}
									</MapEditor>
									<MapEditor
										redrawEvent={redrawEvent}
										drawing={drawing}
										mouseCanvas={mouse}
										dataUrl={pathMap}
										name="Path"
										setCanvas={pathCanvas}
										levelSize={size}
										transparency={true}
										blur={true}
										defaultColor="#FF0000"
										open={openEditor}
										globalMode={globalMode}
										globalPosition={groundUV}
									/>
									<MapEditor
										redrawEvent={redrawEvent}
										drawing={drawing}
										mouseCanvas={mouse}
										dataUrl={waterMap}
										name="Water"
										setCanvas={waterCanvas}
										levelSize={size}
										transparency={false}
										blur={false}
										defaultColor="#0000FF"
										open={openEditor}
										realTimeUpdate={false}
										globalMode={globalMode}
										globalPosition={groundUV}
									/>
									<MapEditor
										redrawEvent={redrawEvent}
										drawing={drawing}
										mouseCanvas={mouse}
										dataUrl={grassMap}
										name="Grass"
										setCanvas={grassCanvas}
										levelSize={size}
										transparency={false}
										blur={false}
										realTimeUpdate={false}
										defaultColor="#00FF00"
										open={openEditor}
										globalMode={globalMode}
										globalPosition={groundUV}
									/>
								</div>
							)}
						</Show>
					</div>
				</div>
				<Show when={Object.keys(entities).length !== 0}>
					<EntitySelector
						boundingBox={boundingBox}
						thumbnailRenderer={thumbnailRenderer}
						setMode={setMode}
						model={model}
						entities={entities}
						selectedCategory={selectedCategory}
						selectedAsset={selectedAsset}
						assetInMap={assetInMap}
					/>
				</Show>
			</div>
		</Show>

	)
}

export default Editor
