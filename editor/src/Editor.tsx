import type { Tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import type { BufferGeometry, Material, Vec2 } from 'three'
import type { AssetData, EditorTags, LevelData, LevelEntity } from './types'

import { init, World } from '@dimforge/rapier3d-compat'
import { faArrowRotateBack, faArrowsRotate, faArrowsUpDownLeftRight, faEarth, faLock, faLockOpen, faMaximize } from '@fortawesome/free-solid-svg-icons'
import { trackDeep, trackStore } from '@solid-primitives/deep'
import { debounce } from '@solid-primitives/scheduled'
import { makePersisted } from '@solid-primitives/storage'
import { get, set } from 'idb-keyval'

import Fa from 'solid-fa'
import { batch, createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'
import { createMutable, modifyMutable, reconcile, unwrap } from 'solid-js/store'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { AmbientLight, BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, GridHelper, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { generateUUID } from 'three/src/math/MathUtils'
import { doorSide } from '@/states/game/doorModel'
import { loadImage } from '../../src/global/assetLoaders'
import { loadAssets } from '../../src/global/assets'
import { RapierDebugRenderer } from '../../src/lib/debugRenderer'
import { getSize } from '../../src/lib/models'
import { getThumbnailRenderer } from '../../src/lib/thumbnailRenderer'
import { GroundMaterial, WaterMaterial } from '../../src/shaders/materials'
import { getGrass, getTrees, setDisplacement } from '../../src/states/game/spawnTrees'
import { getScreenBuffer, imgToCanvas } from '../../src/utils/buffer'
import { Configuration } from './components/Configuration'
import { EntitySelector } from './components/EntitiySelector'
import { EntityList } from './components/EntityList'
import { EntityProps } from './components/EntityProps'
import { LevelProps } from './components/LevelProps'
import { LevelSelector } from './components/LevelSelector'
import { MapEditor } from './components/MapEditor'
import { RangeInput } from './components/RangeInput'
import { Renderer } from './components/Renderer'
import { SelectedEntityProps } from './components/SelectedEntityProps'
import { TagsEditor } from './components/TagsEditor'
import { createFolder, isRepoCloned, loadBoundingBox, loadLevel, loadLevels, loadTagsList, saveBoundingBox, saveLevelFile, saveTagsList } from './lib/fileOperations'

function createArrowMesh() {
	const arrow = new Group()

	const yellow = new MeshBasicMaterial({ color: 0xFFDD00 })

	// Shaft (cylinder)
	const shaftRadius = 0.06
	const shaftHeight = 1.0
	const shaftGeo = new CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 24)
	const shaft = new Mesh(shaftGeo, yellow)
	shaft.position.y = 0.5 // move up so bottom is at y = 0
	arrow.add(shaft)

	// Head (cone)
	const coneRadius = 0.18
	const coneHeight = 0.4
	const coneGeo = new ConeGeometry(coneRadius, coneHeight, 32)
	const cone = new Mesh(coneGeo, yellow)
	cone.rotation.x = Math.PI // flip to point down
	cone.position.y = -0.2 // aligns top of cone with bottom of shaft
	arrow.add(cone)
	arrow.scale.setScalar(15)
	return arrow
}

export const BOUNDING_BOX_FILE_PATH = 'assets/boundingBox.json'
await init()
export function Editor() {
	const boundingBox = createMutable<Record<string, Record<string, AssetData>>>({})
	const loaded = atom(false)

	const folder = 'A-Bunny-s-Revenge'

	const tagsList = atom<EditorTags>({})

	const thumbnailRenderer = getThumbnailRenderer(128, 1.3)
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
	const levelEntities: Record<string, Object3D> = {}
	const tagsContainers = createMutable<Record<string, CSS2DObject>>({})
	const selectedId = atom<string | null>(null)
	const transformControls = new TransformControls(camera, renderer.domElement)
	const transformControlsMode = atom<'translate' | 'scale' | 'rotate'>('translate')

	const displacementScale = atom<number | null>(null)
	const heightCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const heightMapSource = atom<string>('')
	const heightMap = atom<string>('')
	const treeCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const treeMapSource = atom<string>('')
	const treeMap = atom<string>('')
	const pathCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const pathMapSource = atom<string>('')
	const pathMap = atom<string>('')
	const waterCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const waterMapSource = atom<string>('')
	const waterMap = atom<string>('')
	const grassCanvas = atom<HTMLCanvasElement | null>(null, () => false)
	const grassMapSource = atom<string>('')
	const grassMap = atom<string>('')
	let treeGroup: Object3D | null = null
	let grassGroup: Object3D | null = null
	onCleanup(() => {
		renderer.dispose()
		thumbnailRenderer.dispose()
	})

	const debugRenderer = new RapierDebugRenderer(world)
	scene.add(debugRenderer)

	let assets: Awaited<ReturnType<typeof loadAssets>> | null = null

	const entities: Record<string, Record<string, Object3D>> = createMutable({})

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
	const groundMaterial = new MeshStandardMaterial({ transparent: true, opacity: 0 })
	const groundGeometry = new PlaneGeometry(1, 1)
	const groundMesh = new Mesh<BufferGeometry, Material>(groundGeometry, groundMaterial)
	groundMesh.rotation.set(-Math.PI / 2, 0, 0)
	const waterMesh = new Mesh<BufferGeometry, Material>(new PlaneGeometry(1, 1), new MeshStandardMaterial({ color: 0x0000FF }))
	const pointerMesh = new Mesh(groundGeometry, new MeshBasicMaterial({ transparent: true, opacity: 0 }))
	groundMesh.add(pointerMesh, waterMesh)
	groundMesh.add(new Mesh(new SphereGeometry(1), new MeshBasicMaterial({ color: 0xFF0000 })))
	pointerMesh.renderOrder = -10
	const arrow = createArrowMesh()
	group.add(groundMesh, new AmbientLight(0xFFFFFF, 1))
	group.add(arrow)
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
			transformControls.detach()

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

	const addTransformControls = (): [Mesh, TransformControls] => {
		const dummyMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ transparent: true, opacity: 0, color: 0xFFFFFF }))
		const transformControls = new TransformControls(camera, renderer.domElement)
		transformControls.attach(dummyMesh)
		scene.add(dummyMesh, transformControls)
		let prevOrbit: boolean | null = null
		let prevMap: boolean | null = null
		transformControls.addEventListener('axis-changed', ({ value }) => {
			if (value === null && typeof prevOrbit === 'boolean' && typeof prevMap === 'boolean') {
				orbitControls.enabled = prevOrbit
				mapControls.enabled = prevMap
				prevOrbit = null
				prevMap = null
			} else {
				prevOrbit ??= orbitControls.enabled
				prevMap ??= mapControls.enabled
				orbitControls.enabled = false
				mapControls.enabled = false
			}
		})
		return [dummyMesh, transformControls]
	}

	const resizeCanvas = (canvas: Atom<HTMLCanvasElement | null>, source: Atom<string>, size: Vector2) => {
		const canvasElement = canvas()
		if (!canvasElement) return
		const newCanvas = getScreenBuffer(size.x, size.y)
		newCanvas.drawImage(canvasElement, 0, 0, canvasElement.width, canvasElement.height, 0, 0, size.x, size.y)
		const url = newCanvas.canvas.toDataURL()
		canvas(newCanvas.canvas)
		source(url)
	}
	createEffect(on(levelSize, (size) => {
		if (!size) return
		resizeCanvas(heightCanvas, heightMapSource, size)
		resizeCanvas(pathCanvas, pathMapSource, size)
		resizeCanvas(grassCanvas, grassMapSource, size)
		resizeCanvas(waterCanvas, waterMapSource, size)
		resizeCanvas(treeCanvas, treeMapSource, size)
	}))

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

	createEffect(() => {
		const hCanvas = heightCanvas()
		const tCanvas = treeCanvas()
		const scale = displacementScale()
		if (!hCanvas || !tCanvas || !scale) return
		const models = [
			entities.trees.Low_Poly_Forest_treeTall01,
			entities.trees.Low_Poly_Forest_treeTall02,
			entities.trees.Low_Poly_Forest_treeTall03,
			entities.trees.Low_Poly_Forest_treeTall04,
		]
		const trees = getTrees(models, hCanvas, tCanvas, 10, scale)
		const newTreeGroup = new Group()
		for (const [generator] of trees) {
			newTreeGroup.add(generator.process())
		}
		treeGroup?.removeFromParent()
		treeGroup = newTreeGroup
		group.add(treeGroup)
	})

	createEffect(() => {
		const hCanvas = heightCanvas()
		const gCanvas = grassCanvas()
		const scale = displacementScale()
		if (!hCanvas || !gCanvas || !scale) return
		const [grass, flowers] = ['Grass_', 'Flower_'].map(name => Object.entries(entities.vegetation).reduce<Object3D[]>((acc, [modelName, model]) => {
			if (modelName.includes(name)) acc.push(model)
			return acc
		}, []))
		const { process } = getGrass(grass, flowers, hCanvas, gCanvas, 5, scale)
		const newGrassGroup = process()
		group.add(newGrassGroup)
		grassGroup?.removeFromParent()
		grassGroup = newGrassGroup
	})
	createEffect(() => {
		const size = levelSize()
		const canvas = pathCanvas()
		if (!size || !canvas) return
		const level = new CanvasTexture(canvas)
		groundMesh.material = new GroundMaterial().setUniforms({
			level,
			rock: null,
			size: new Vector2(size.x, size.y),
			ground: assets?.textures.Dirt4_Dark,
			rock_texture: assets?.textures.Rocks1_Light,
		})
	})
	createEffect(() => {
		const size = levelSize()
		const canvas = waterCanvas()
		if (!size || !canvas) return
		waterMesh.material = new WaterMaterial({ map: new CanvasTexture(canvas) }).setUniforms({ size, time: 1 })
	})

	transformControls.addEventListener('axis-changed', ({ value }) => {
		mapControls.enabled = value === null
		const id = selectedId()
		if (value === null && id) {
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
			const cloneModel = clone(obj)
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
		if (mode() === 'level' && !drawing()) {
			if (e.buttons === 1) {
				const model = tempModel()
				const pos = getMousePosition(e)
				const category = selectedCategory()
				const asset = selectedAsset()
				if (model && category && asset) {
					const entity = clone(model)
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
			transformControls.detach()
		} else {
			const entity = levelEntities[id]
			transformControls.attach(entity)
			transformControlsMode('translate')
			scene.add(transformControls)
			selectedCategory(levelEntitiesData[id].category)
		}
	}))

	const changeMode = (e: KeyboardEvent) => {
		if (!selectedId()) return
		switch (e.key) {
			case 'g':return	transformControlsMode('translate')
			case 's':return	transformControlsMode('scale')
			case 'r':return	transformControlsMode('rotate')
		}
	}
	createEffect(() => transformControls.setMode(transformControlsMode()))
	const scaleLock = atom(true)
	transformControls.addEventListener('change', () => {
		if (transformControls.axis && transformControls.mode === 'scale' && scaleLock()) {
			const axis = [...transformControls.axis?.toLowerCase()].filter(axis => ['x', 'y', 'z'].includes(axis)) as Array<'x' | 'y' | 'z'>
			const max = Math.max(...axis.map(axis => transformControls.object?.scale[axis] ?? 0))
			transformControls.object?.scale.setScalar(max)
		}
	})
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
		trackDeep(levelEntitiesData)
		if (size && scale) {
			return {
				sizeX: size.x,
				sizeY: size.y,
				entities: levelEntitiesData,
				displacementScale: scale,
				heightMap: height,
				treeMap: tree,
				pathMap: path,
				waterMap: water,
				grassMap: grass,
			}
		}
		return null
	})

	const updateEntity = (id: string) => {
		const entityData = levelEntitiesData[id]
		const model = entities?.[entityData.category]?.[entityData.model]
		if (model) {
			let parent = levelEntities[id]
			if (!parent) {
				const model = entities?.[entityData.category]?.[entityData.model]

				const cloned = clone(model)
				cloned.position.fromArray(entityData.position)
				cloned.rotation.setFromQuaternion(new Quaternion().fromArray(entityData.rotation))
				cloned.scale.copy(new Vector3(...entityData.scale).multiply(getGlobalScale(id)))
				const obj = new CSS2DObject(document.createElement('div'))
				tagsContainers[id] = obj
				cloned.add(obj)
				group.add(cloned)

				levelEntities[id] = cloned
				parent = cloned
			}
			if (entityData.grid && (entityData.grid.repetitionX > 0 || entityData.grid.repetitionY > 0)) {
				repetitions[id] ??= {}
				const prevData = repetitions[id]
				const newData: Record<string, Object3D> = {}
				for (let x = 0; x <= entityData.grid.repetitionX; x++) {
					for (let y = 0; y <= entityData.grid.repetitionY; y++) {
						if (!(x === 0 && y === 0)) {
							const key = `${x}-${y}`
							prevData[key] ??= clone(model)
							newData[key] = prevData[key]
							const repetition = newData[key]
							parent.add(repetition)
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
			groundEntity(id)
		}
	}

	const removeEntity = (id: string) => {
		arrow.removeFromParent()
		selectedId(null)
		levelEntities[id].removeFromParent()
		delete levelEntitiesData[id]
		delete levelEntities[id]
	}

	const fetchLevel = async (levelName: string) => {
		scene.clear()
		for (const id in levelEntities) {
			removeEntity(id)
		}
		const levelData = await loadLevel(folder, levelName)
		batch(async () => {
			for (const tagContainer of Object.values(tagsContainers)) {
				tagContainer.remove()
			}
			modifyMutable(tagsContainers, reconcile({}))
			displacementScale(levelData.displacementScale)
			heightMap(levelData.heightMap)
			treeMap(levelData.treeMap)
			pathMap(levelData.pathMap)
			waterMap(levelData.waterMap)
			grassMap(levelData.grassMap)
			heightMapSource(levelData.heightMap)
			treeMapSource(levelData.treeMap)
			pathMapSource(levelData.pathMap)
			waterMapSource(levelData.waterMap)
			grassMapSource(levelData.grassMap)

			selectedLevel(levelName)
			const size = new Vector2(levelData.sizeX, levelData.sizeY)
			levelSize(size)
			waterCanvas(imgToCanvas(await loadImage(levelData.waterMap)).canvas)
			heightCanvas(imgToCanvas(await loadImage(levelData.heightMap)).canvas)
			treeCanvas(imgToCanvas(await loadImage(levelData.treeMap)).canvas)
			pathCanvas(imgToCanvas(await loadImage(levelData.pathMap)).canvas)
			grassCanvas(imgToCanvas(await loadImage(levelData.grassMap)).canvas)
			orbitControls.enabled = false
			mapControls.enabled = true
			scene.add(camera)
			camera.lookAt(new Vector3())
			camera.updateProjectionMatrix()

			scene.clear()
			scene.add(group)
			groundMesh.geometry = setDisplacement(size, heightCanvas()!, waterCanvas()!, levelData.displacementScale)
			pointerMesh.geometry = setDisplacement(size, heightCanvas()!, waterCanvas()!, levelData.displacementScale)

			modifyMutable(levelEntitiesData, reconcile(levelData.entities))
			setMode('level')
			setTimeout(() => {
				for (const id in levelEntitiesData) {
					updateEntity(id)
				}
			}, 10)
		})
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
	createEffect(() => {
		const id = hoveredEntity()
		if (id) {
			arrow.visible = true
			const yOffet = getSize(levelEntities[id]).y
			levelEntities[id].getWorldPosition(arrow.position)
			arrow.position.add(new Vector3(0, yOffet, 0))
			scene.add(arrow)
		} else {
			arrow.visible = false
		}
	})

	const saveLevelLocal = debounce(() => {
		const levelName = selectedLevel()
		const data = levelData()
		if (levelName && data && loaded()) {
			set(levelName, unwrap(data))
		}
	}, 1000)
	createEffect(on(levelData, () => {
		saveLevelLocal()
	}))

	const saveLevel = async () => {
		const levelName = selectedLevel()
		if (levelName) {
			const data = await get(levelName)
			return saveLevelFile(folder, levelName, data)
		}
	}

	const saveBoundingBoxDebounced = debounce(() => {
		if (loaded()) {
			saveBoundingBox(folder, boundingBox)
		}
	}, 500)
	createEffect(() => {
		trackStore(boundingBox)
		saveBoundingBoxDebounced()
	})
	const saveTagsListfn = (tags: EditorTags) => {
		tagsList(tags)
		saveTagsList(folder, tags)
	}

	const fetchLevels = async (folder: string) => {
		const dirs = await loadLevels(folder)
		levels(dirs.filter(x => x.name !== 'data.json').map(x => x.name.replace('.json', '')))
		if (levels().length !== 0) {
			await fetchLevel(levels()[0])
		}
	}
	const fetchBoundingBox = async (folder: string) => {
		const data = await loadBoundingBox(folder)
		modifyMutable(boundingBox, reconcile(data))
	}
	const fetchTagsList = async (folder: string) => {
		const tags = await loadTagsList(folder)
		tagsList(tags)
	}

	const repoCloned = atom(false)
	const reload = async (folder: string) => {
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
			await fetchLevels(folder)
			await fetchTagsList(folder)
			loaded(true)
		}
	}

	onMount(async () => {
		const marker = new Mesh(new SphereGeometry(3), new MeshBasicMaterial())
		const arrow = new Mesh(new ConeGeometry(2, 5), new MeshBasicMaterial({ color: 0xFF0000 }))
		arrow.position.set(0, 0, 3)
		arrow.rotateX(Math.PI / 2)
		marker.add(arrow)
		const box = new Mesh(new BoxGeometry(1, 1), new MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 1 }))
		const door = doorSide()
		entities.markers = { box, marker, door }
		assets = await loadAssets(thumbnailRenderer)
		for (const key in assets) {
			const category = assets[key as keyof typeof assets]
			const cat = category as unknown as Record<string, any>
			for (const asset in cat) {
				const obj = cat[asset] as unknown as any
				if (typeof obj == 'object' && 'scene' in obj) {
					entities[key] ??= {}
					entities[key][asset] = obj.scene
				}
				if (obj instanceof Object3D) {
					entities[key] ??= {}
					entities[key][asset] ??= obj
				}
			}
		}
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
									levelSize={levelSize}
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
										</Portal>
									)
								}}
							</For>
						</Show>
						<Show when={mode() === 'entity'}>
							<EntityProps
								saveTagsList={saveTagsListfn}
								tagsList={tagsList}
								debugRenderer={debugRenderer}
								transformControlsMode={transformControlsMode}
								boundingBox={boundingBox}
								selectedAsset={selectedAsset}
								selectedCategory={selectedCategory}
								model={model}
								world={world}
								addTransformControls={addTransformControls}
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
										<button onClick={resetScale}>
											<Fa icon={faArrowRotateBack}></Fa>
											{' '}
											Reset
										</button>
										<button onClick={resetGlobalScale}>
											<Fa icon={faArrowRotateBack}></Fa>
											{' '}
											Reset global scale
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
								const globalScale = boundingBox?.[entity.category]?.[entity.model]?.scale
								return (
									<SelectedEntityProps
										globalScale={globalScale}
										destroy={() => removeEntity(id())}
										entity={levelEntitiesData[id()]}
										update={() => updateEntity(id())}
									/>
								)
							}}
						</Show>
						<Show when={mode() === 'level' && levelSize()}>
							{size => (
								<div classList={{ hidden: Boolean(selectedId()) }}>
									<MapEditor
										drawing={drawing}
										mouseCanvas={mouse}
										source={heightMapSource}
										dataUrl={heightMap}
										name="Height map"
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
										drawing={drawing}
										mouseCanvas={mouse}
										source={treeMapSource}
										dataUrl={treeMap}
										name="Trees"
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
										drawing={drawing}
										mouseCanvas={mouse}
										source={pathMapSource}
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
										drawing={drawing}
										mouseCanvas={mouse}
										source={waterMapSource}
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
										drawing={drawing}
										mouseCanvas={mouse}
										source={grassMapSource}
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
