import type { Atom } from 'solid-use/atom'
import type { BufferGeometry, Material, Vec2 } from 'three'
import type { AssetData, LevelData, LevelEntity } from './types'
import { init, World } from '@dimforge/rapier3d-compat'

import { faArrowRotateBack, faArrowsRotate, faArrowsUpDownLeftRight, faEarth, faLock, faLockOpen, faMaximize } from '@fortawesome/free-solid-svg-icons'
import { trackDeep } from '@solid-primitives/deep'
import { createScheduled, debounce } from '@solid-primitives/scheduled'
import Fa from 'solid-fa'
import { createEffect, createMemo, on, onCleanup, onMount, Show } from 'solid-js'
import { createMutable, modifyMutable, reconcile } from 'solid-js/store'

import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { AmbientLight, BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, GridHelper, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer } from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { generateUUID } from 'three/src/math/MathUtils'
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
import { createFolder, isRepoCloned, loadBoundingBox, loadLevel, loadLevels, saveBoundingBox, saveLevel } from './lib/fileOperations'

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

	const thumbnailRenderer = getThumbnailRenderer(128, 1.3)
	const mode = atom<'level' | 'entity'>('level')
	const renderer = new WebGLRenderer({ alpha: true })
	renderer.domElement.classList.add('level-renderer')
	renderer.setClearColor(0x222222)
	const scene = new Scene()
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	const orbitControls = new OrbitControls(camera, renderer.domElement)
	const mapControls = new MapControls(camera, renderer.domElement)
	const world = new World({ x: 0, y: 0, z: 0 })

	const levelEntitiesData = createMutable<Record<string, LevelEntity>>({})
	const levelEntities: Record<string, Object3D> = {}
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
	onCleanup(() => renderer.dispose())

	const debugRenderer = new RapierDebugRenderer(world)
	scene.add(debugRenderer.mesh)
	renderer.setAnimationLoop(() => {
		world.step()
		debugRenderer?.update()
		renderer.render(scene, camera)
	})
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
	const mousePosition = atom<Vec2 | null>(null)

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

	const openEditor = atom<null | string>(null)
	const drawing = atom<string | null>(null)
	createEffect<'level' | 'entity'>((prev) => {
		if (mode() === 'entity' && prev !== 'entity') {
			tempModel(null)
			selectedLevel(null)
			scene.clear()
			orbitControls.enabled = true
			mapControls.enabled = false
			scene.add(new AmbientLight(0xFFFFFF, 1))
			camera.position.set(0, 10, 5)
			scene.add(debugRenderer.mesh)
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
	const groundEntity = (id: string | null) => {
		const scale = displacementScale()
		if (id && levelEntities[id] && levelEntitiesData[id].grounded && scale) {
			const pos = levelEntities[id].position
			const maxY = groundMesh.position.y * scale + 10
			const ray = new Raycaster(pos.clone().add(new Vector3(0, maxY, 0)), new Vector3(0, -1, 0), 1, scale * 3)
			const intersection = ray.intersectObject(groundMesh)?.[0]
			if (intersection) {
				levelEntities[id].position.setY(intersection.point.y)
			}
			for (const repetition of Object.values(repetitions?.[id] ?? {})) {
				const ray = new Raycaster(new Vector3(0, maxY, 0).add(levelEntities[id].position).add(repetition.position), new Vector3(0, -1, 0), 0.1, scale * 3)
				const int = ray.intersectObject(groundMesh)?.[0]
				if (int) {
					repetition.position.setY(int.point.y - levelEntities[id].position.y)
				}
			}
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

	onMount(async () => {
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
		const { process } = getTrees(models, hCanvas, tCanvas, 10, scale)
		const newTreeGroup = process()
		group.add(newTreeGroup)
		treeGroup?.removeFromParent()
		treeGroup = newTreeGroup
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
	})

	const onMouseUp = () => {
		groundEntity(selectedId())
		const id = selectedId()
		if (id) {
			levelEntitiesData[id].position = levelEntities[id].position.toArray()
			levelEntitiesData[id].scale = levelEntities[id].scale.clone().divide(getGlobalScale(id)).toArray()
			levelEntitiesData[id].rotation = new Quaternion().setFromEuler(levelEntities[id].rotation).toArray()
		}
	}

	const groundUV = atom<Vector2 | null>(null)

	const mouseRay = new Raycaster()
	createEffect(on(mousePosition, (mousePosition) => {
		const model = tempModel()
		if (mousePosition) {
			if (model || drawing()) {
				mouseRay.setFromCamera(new Vector2(mousePosition.x, mousePosition.y), camera)
				const intersection = mouseRay.intersectObject(groundMesh)
				if (intersection[0]) {
					groundUV(new Vector2(intersection[0].uv!.x, 1 - intersection[0].uv!.y))

					if (model) {
						model.visible = true
						model.position.copy(intersection[0].point)
					}
				}
			}
		}
	}))

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
				const pos = mousePosition()
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

	const fetchLevel = async (levelName: string) => {
		const levelData = await loadLevel(folder, levelName)
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
		mode('level')
		setTimeout(() => {
			for (const id in levelEntitiesData) {
				updateEntity(id)
			}
		}, 10)
	}

	const removeEntity = (id: string) => {
		arrow.removeFromParent()
		selectedId(null)
		levelEntities[id].removeFromParent()
		delete levelEntitiesData[id]
		delete levelEntities[id]
	}

	createEffect(() => {
		if (!openEditor()) {
			drawing(null)
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
	const sheduled = createScheduled(fn => debounce(fn, 1000))
	createEffect(() => {
		const levelName = selectedLevel()
		const data = levelData()
		trackDeep(levelData)
		if (levelName && data && sheduled() && loaded()) {
			saveLevel(folder, levelName, data)
		}
	})
	const saveBoundingBoxDebounced = createScheduled(fn => debounce(fn, 100))
	createEffect(() => {
		trackDeep(boundingBox)
		if (saveBoundingBoxDebounced() && loaded()) {
			saveBoundingBox(folder, boundingBox)
		}
	})

	const fetchLevels = async (folder: string) => {
		const dirs = await loadLevels(folder)
		levels(dirs.filter(x => x.name !== 'data.json').map(x => x.name.replace('.json', '')))
		if (levels().length !== 0) {
			loadLevel(folder, levels()[0])
		}
	}
	const fetchBoundingBox = async (folder: string) => {
		const data = await loadBoundingBox(folder)
		modifyMutable(boundingBox, reconcile(data))
	}

	const repoCloned = atom(false)
	const reload = async (folder: string) => {
		await createFolder(folder)
		const repo = await isRepoCloned(folder)
		repoCloned(repo)
		if (repo) {
			await fetchBoundingBox(folder)
			await fetchLevels(folder)
			loaded(true)
		}
	}

	onMount(() => reload(folder))

	css/* css */`
	.hidden{
		display: none
	}
	.editor{
		height: calc(100dvh - 1rem);
		padding: 0.5rem;	
	}
	.top{
		display: grid;
		grid-template-columns: 1fr 5fr 1fr;
		height: 80%;
		overflow-y: hidden;
		gap:0.5rem;
		margin-bottom: 0.5rem;
	}
	.map-editors{
		height: 100%;
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
						/>
						<LevelSelector
							fetchLevels={fetchLevels}
							levels={levels}
							loadLevel={fetchLevel}
							selectedLevel={selectedLevel}
							folder={folder}
						/>
						<Show when={mode() === 'level'}>
							<LevelProps
								levelSize={levelSize}
								scene={scene}
							/>

							<EntityList
								selectedId={selectedId}
								hoveredEntity={hoveredEntity}
								levelEntitiesData={levelEntitiesData}
								removeEntity={removeEntity}
							/>
						</Show>
						<Show when={mode() === 'entity'}>
							<EntityProps
								boundingBox={boundingBox}
								selectedAsset={selectedAsset}
								selectedCategory={selectedCategory}
								model={model}
								world={world}
								addTransformControls={addTransformControls}
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
							onMouseUp()
						}}
						onContextMenu={e => e.preventDefault()}
					>
						<Renderer renderer={renderer} camera={camera} mousePosition={mousePosition} onPointerDown={onPointerDown} />
						<Show when={selectedId()}>
							<div class="mode-buttons">
								<div class="scale-buttons">
									<button onClick={() => transformControlsMode('scale')} classList={{ selected: transformControlsMode() === 'scale' }}>
										<Fa icon={faMaximize}></Fa>
										{' '}
										(S)
									</button>
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
							{id => (
								<SelectedEntityProps
									destroy={() => removeEntity(id())}
									entity={levelEntitiesData[id()]}
									update={() => updateEntity(id())}
								/>
							)}
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
						mode={mode}
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
