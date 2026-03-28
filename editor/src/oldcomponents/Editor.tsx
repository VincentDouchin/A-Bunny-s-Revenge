// import type { Tags } from '@assets/tagsList'
// import type { NavMesh } from 'navcat'
// import type { BufferGeometry, Material, Object3D, Vector2Like, Vector3Like } from 'three/webgpu'
// import type { AssetData, ColliderData, EditorTags, InstanceData, InstanceEntity, LevelData, LevelEntity } from '../types'
// import type { AnchorX, AnchorY } from './ResizeModal'
// import type { loadAssets } from '@/global/assets'
// import type { Direction } from '@/lib/directions'
// import type { Thumbnailer } from '@/lib/thumbnailRenderer'
// import { init, World } from '@dimforge/rapier3d-compat'
// import { faArrowsRotate, faArrowsUpDownLeftRight, faEarth, faLocationArrow, faLock, faLockOpen, faMaximize } from '@fortawesome/free-solid-svg-icons'
// import { trackDeep } from '@solid-primitives/deep'
// import { debounce } from '@solid-primitives/scheduled'
// import { makePersisted } from '@solid-primitives/storage'
// import { Event } from 'eventery'
// import { get, set } from 'idb-keyval'
// import Fa from 'solid-fa'
// import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'
// import { createMutable, modifyMutable, reconcile, unwrap } from 'solid-js/store'
// import { Portal } from 'solid-js/web'
// import { css } from 'solid-styled'
// import atom from 'solid-use/atom'
// import { WebGLRenderer } from 'three'
// import { CSS2DObject, CSS2DRenderer, FullScreenQuad, MapControls, OrbitControls, SkeletonUtils, TransformControls } from 'three/addons'
// import { generateUUID } from 'three/src/math/MathUtils.js'
// import { color, instancedBufferAttribute, mix, positionLocal, texture, uv, vec2, vec4 } from 'three/tsl'
// import { AmbientLight, Box2, CanvasTexture, GridHelper, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster, Scene, ShaderMaterial, SphereGeometry, SpriteNodeMaterial, Vector2, Vector3, WebGPURenderer } from 'three/webgpu'
// import { InstancedModel, loadImage } from '@/global/assetLoaders'
// import { WaterMaterial } from '@/shaders/waterMaterial'
// import { getGroundMaterial } from '@/states/game/groundMaterial'
// import { imgToCanvas } from '@/utils/buffer'
// import { entries, objectKeys } from '@/utils/mapFunctions'
// import { RapierDebugRenderer } from '../../../src/lib/debugRenderer'
// import { composeMatrix, getGrass, getTrees, setDisplacement } from '../../../src/states/game/spawnTrees'
// import { createFolder, isRepoCloned, loadBoundingBox, loadLevel, loadLevels, loadTagsList, saveBoundingBox, saveImage, saveLevelFile, saveTagsList } from '../lib/fileOperations'
// import { floodFill, generateNavMesh, getMesh, updateNavMeshVisualization } from '../lib/navMesh'
// import { buildTreeBoundaryGrid, isInBoundaryCell, mergeGrids, visualizeGrid } from '../lib/treeOptimizer'
// import { Configuration } from './Configuration'
// import { EntitySelector } from './EntitiySelector'
// import { EntityList } from './EntityList'
// import { LevelProps } from './LevelProps'
// import { LevelSelector } from './LevelSelector'
// import FastNoiseLiteSrc from './lib/FastNoiseLite.glsl?raw'
// import { MapEditor } from './MapEditor'
// import { ModelColliders } from './ModelCollider'
// import { RangeInput } from './RangeInput'
// import { Renderer } from './Renderer'
// import { SelectedEntityProps } from './SelectedEntityProps'
// import { TagsEditor } from './TagsEditor'

// export const BOUNDING_BOX_FILE_PATH = 'assets/boundingBox.json'
// await init()
// export function Editor({ entities, thumbnailRenderer, assets }: {
// 	entities: Record<string, Record<string, Object3D>>
// 	thumbnailRenderer: Thumbnailer
// 	assets: Awaited<ReturnType<typeof loadAssets>>
// }) {
// 	const boundingBox = createMutable<Record<string, Record<string, AssetData>>>({})
// 	const loaded = atom(false)
// 	const loading = atom(false)
// 	const floorTexture = atom<'planks' | 'grass' | null>(null)

// 	const [localFolder, setLocalFolder] = makePersisted(createSignal<null | string>(null))

// 	const tagsList = atom<EditorTags>({})

// 	const [mode, setMode] = makePersisted(createSignal<'level' | 'entity'>('level'))
// 	const renderer = new WebGPURenderer({ alpha: true })
// 	const cssRenderer = new CSS2DRenderer()
// 	renderer.domElement.classList.add('renderer', 'level-renderer')
// 	cssRenderer.domElement.classList.add('renderer', 'css-renderer')
// 	renderer.setClearColor(0x222222)
// 	const scene = new Scene()
// 	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
// 	const orbitControls = new OrbitControls(camera, renderer.domElement)
// 	const mapControls = new MapControls(camera, renderer.domElement)
// 	const world = new World({ x: 0, y: 0, z: 0 })

// 	const levelEntitiesData = createMutable<Record<string, LevelEntity>>({})
// 	const instances = createMutable<Record<string, InstanceData>>({})
// 	const levelEntities: Record<string, Object3D> = {}
// 	const tagsContainers = createMutable<Record<string, CSS2DObject>>({})
// 	const selectedId = atom<string | null>(null)

// 	const t = new TransformControls(camera, renderer.domElement)
// 	const transformControlsMode = atom<'translate' | 'scale' | 'rotate'>('translate')

// 	const displacementScale = atom<number | null>(null)

// 	const heightCanvas = atom<HTMLCanvasElement | null>(null, () => false)

// 	const treeCanvas = atom<HTMLCanvasElement | null>(null, () => false)

// 	const pathCanvas = atom<HTMLCanvasElement | null>(null, () => false)

// 	const waterCanvas = atom<HTMLCanvasElement | null>(null, () => false)

// 	const grassCanvas = atom<HTMLCanvasElement | null>(null, () => false)
// 	let treeGroup: Object3D | null = null
// 	onCleanup(() => {
// 		renderer.dispose()
// 		thumbnailRenderer.dispose()
// 	})

// 	const redrawEvent = new Event()

// 	const debugRenderer = new RapierDebugRenderer(world)
// 	scene.add(debugRenderer)

// 	const selectedCategory = atom<string | null>(null)
// 	const selectedAsset = atom<string | null>(null)
// 	const model = createMemo(() => {
// 		const category = selectedCategory()
// 		const asset = selectedAsset()
// 		if (category && asset) {
// 			return entities[category]?.[asset]
// 		}
// 		return null
// 	})
// 	const levels = atom<string[]>([])
// 	const [selectedLevel, setSelectedLevel] = makePersisted(createSignal<string | null>(null), { storage: localStorage })
// 	const levelSize = atom<Vector2 | null>(null)

// 	const tempModel = atom<Object3D | null>(null)

// 	const repetitions: Record<string, Record<string, Object3D>> = {}

// 	const group = new Group()
// 	const helperGroup = new Group()
// 	scene.add(helperGroup)
// 	const groundMaterial = new MeshStandardMaterial({ transparent: true, opacity: 0 })
// 	const groundGeometry = new PlaneGeometry(1, 1)
// 	const groundMesh = new Mesh<BufferGeometry, Material>(groundGeometry, groundMaterial)
// 	groundMesh.rotation.set(-Math.PI / 2, 0, 0)
// 	const waterMesh = new Mesh<BufferGeometry, Material>(new PlaneGeometry(1, 1), new MeshStandardMaterial({ color: 0x0000FF }))
// 	const pointerMesh = new Mesh(groundGeometry, new MeshBasicMaterial({ transparent: true, opacity: 0 }))
// 	groundMesh.add(pointerMesh, waterMesh)
// 	groundMesh.add(new Mesh(new SphereGeometry(1), new MeshBasicMaterial({ color: 0xFF0000 })))
// 	pointerMesh.renderOrder = -10
// 	group.add(groundMesh, new AmbientLight(0xFFFFFF, 1))
// 	const getGlobalScale = (id: string) => {
// 		const entity = levelEntitiesData[id]
// 		return new Vector3(...(boundingBox?.[entity.category]?.[entity.model]?.scale ?? [1, 1, 1]))
// 	}
// 	let prevModel: Object3D | null = null

// 	const tags = atom<Partial<Tags>>({})
// 	const localTags = atom<Partial<Tags>>({})
// 	createEffect(on(selectedId, (id) => {
// 		if (id) {
// 			const entity = levelEntitiesData[id]
// 			const globalTags = boundingBox?.[entity.category]?.[entity.model]?.tags
// 			tags(globalTags ?? {})
// 			localTags(entity.tags ?? {})
// 		} else {
// 			tags({})
// 			localTags({})
// 		}
// 	}))
// 	createEffect(on(tags, (tagsValue) => {
// 		const id = selectedId()
// 		if (id) {
// 			const entity = levelEntitiesData[id]
// 			boundingBox[entity.category] ??= {}
// 			boundingBox[entity.category][entity.model] ??= {}
// 			boundingBox[entity.category][entity.model].tags = tagsValue
// 		}
// 	}))
// 	createEffect(on(localTags, (localTagsValue) => {
// 		const id = selectedId()
// 		if (id) {
// 			const entity = levelEntitiesData[id]
// 			entity.tags = localTagsValue
// 		}
// 	}))

// 	const openEditor = atom<null | string>(null)
// 	const drawing = atom<boolean>(false)
// 	createEffect<'level' | 'entity'>((prev) => {
// 		if (mode() === 'entity' && prev !== 'entity') {
// 			tempModel(null)
// 			setSelectedLevel(null)
// 			scene.clear()
// 			orbitControls.enabled = true
// 			mapControls.enabled = false
// 			scene.add(new AmbientLight(0xFFFFFF, 1))
// 			camera.position.set(0, 10, 5)
// 			scene.add(debugRenderer)
// 			t.detach()

// 			const grid = new GridHelper(10, 10)
// 			scene.add(grid)
// 			camera.lookAt(new Vector3())
// 		}
// 		if (mode() === 'entity') {
// 			prevModel?.removeFromParent()
// 			prevModel = model()
// 			if (prevModel) {
// 				scene.add(prevModel)
// 			}
// 		}
// 		return mode()
// 	}, mode())
// 	let isGrounding = false

// 	const groundEntity = (id: string | null) => {
// 		if (isGrounding) return // Prevent recursive calls

// 		const scale = displacementScale()
// 		if (id && levelEntities[id] && levelEntitiesData[id].grounded && scale) {
// 			isGrounding = true // Set flag

// 			const pos = levelEntities[id].position
// 			const ray = new Raycaster(pos.clone().add(new Vector3(0, 1000, 0)), new Vector3(0, -1, 0), 1, 2000)
// 			const intersection = ray.intersectObject(groundMesh)?.[0]
// 			if (intersection) {
// 				levelEntities[id].position.setY(intersection.point.y)
// 			}
// 			for (const repetition of Object.values(repetitions?.[id] ?? {})) {
// 				const origin = new Vector3()
// 				repetition.getWorldPosition(origin)
// 				origin.setY(1000)
// 				const ray = new Raycaster(origin, new Vector3(0, -1, 0), 0.1, 2000)
// 				const int = ray.intersectObject(groundMesh)?.[0]
// 				if (int) {
// 					repetition.worldToLocal(int.point)
// 					repetition.position.setY(int.point.y)
// 				}
// 			}

// 			isGrounding = false // Clear flag
// 		}
// 	}

// 	createEffect(() => {
// 		const size = levelSize()
// 		if (size) {
// 			groundMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
// 			pointerMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
// 			waterMesh.geometry = new PlaneGeometry(size.x, size.y, size.x, size.y)
// 			const max = Math.max(size.x, size.y)
// 			camera.position.set(0, max, max / 2)
// 		}
// 	})

// 	const transformControls = new TransformControls(camera, renderer.domElement)

// 	createEffect(on(
// 		() => [heightCanvas(), levelSize(), waterCanvas(), displacementScale()],
// 		() => {
// 			const canvas = heightCanvas()
// 			const size = levelSize()
// 			const wCanvas = waterCanvas()
// 			const scale = displacementScale()
// 			if (!size || !wCanvas || !scale) return
// 			groundMesh.geometry = setDisplacement(size, canvas, wCanvas, scale)
// 			pointerMesh.geometry = setDisplacement(size, canvas, wCanvas, scale)
// 			groundMesh.position.set(0, -scale / 2, 0)
// 			waterMesh.position.set(0, 0, scale / 2 - 2)
// 		},
// 	))
// 	const completeNavMesh = atom<NavMesh | null>(null)
// 	let navMeshHelperObj: Object3D | null = null
// 	let navMesh: NavMesh | null = null
// 	const displayNavMesh = () => {
// 		const completeNavMeshValue = completeNavMesh()
// 		if (completeNavMeshValue) {
// 			updateNavMeshVisualization(scene, completeNavMeshValue)
// 		}
// 	}
// 	const addNavMesh = () => {
// 		const meshes: Mesh<BufferGeometry>[] = [groundMesh]
// 		for (const id in levelEntitiesData) {
// 			const data = levelEntitiesData[id]
// 			const matrix = new Matrix4().compose(
// 				new Vector3().fromArray(data.position),
// 				new Quaternion().fromArray(data.rotation),
// 				new Vector3().fromArray(data.scale),
// 			)
// 			const bb = boundingBox?.[data.category]?.[data.model]
// 			const model = entities[data.category][data.model]

// 			const meshColliders = getMesh(bb, matrix, model)

// 			meshColliders.forEach((mesh) => {
// 				helperGroup.add(mesh)
// 				meshes.push(mesh)
// 			})
// 		}
// 		for (const key in instances) {
// 			const instance = instances[key]
// 			for (const instanceEntity of instance.entities) {
// 				if (instanceEntity.collider) {
// 					const matrix = composeMatrix(instanceEntity)
// 					const bb = boundingBox?.[instance.category]?.[instance.model]
// 					const model = entities[instance.category][instance.model]

// 					const meshColliders = getMesh(bb, matrix, model)

// 					meshColliders.forEach((mesh) => {
// 						helperGroup.add(mesh)
// 						meshes.push(mesh)
// 					})
// 				}
// 			}
// 		}
// 		const res = generateNavMesh(meshes)
// 		navMesh = res.navMesh
// 		navMeshHelperObj?.removeFromParent()
// 		navMeshHelperObj = res.navMeshHelper.object
// 		group.add(navMeshHelperObj)
// 	}

// 	const getDoorBoundaries = (e: LevelEntity) => {
// 		const halfSize = new Vector3()
// 			.fromArray(e.scale)
// 			.multiplyScalar(0.5)
// 			.applyQuaternion(new Quaternion().fromArray(e.rotation))
// 		const p = new Vector3().fromArray(e.position)
// 		const min = new Vector2(
// 			p.x - Math.abs(halfSize.x),
// 			p.z - Math.abs(halfSize.z),
// 		)
// 		const max = new Vector2(
// 			p.x + Math.abs(halfSize.x),
// 			p.z + Math.abs(halfSize.z),
// 		)

// 		return new Box2(min, max)
// 	}

// 	let grid: Object3D | null = null
// 	createEffect(on(treeCanvas, (tCanvas) => {
// 		if (tCanvas) {
// 			const hCanvas = heightCanvas()
// 			const scale = displacementScale()
// 			const size = levelSize()
// 			if (!scale || !size) return

// 			const models = [
// 				'Low_Poly_Forest_treeTall01',
// 				'Low_Poly_Forest_treeTall02',
// 				'Low_Poly_Forest_treeTall03',
// 				'Low_Poly_Forest_treeTall04',
// 			] as const

// 			const getTreeData = (i: number, position: Vector3Like) => {
// 				const collider = boundingBox.trees[models[i]].collider as ColliderData & { type: 'cylinder' }
// 				const radius = collider.size.x
// 				return {
// 					position,
// 					radius,
// 				}
// 			}

// 			const trees = getTrees(models.length, hCanvas, tCanvas, 10, scale)
// 			const treeData = trees.flatMap((trees, i) => trees.map(t => getTreeData(i, t.position)))
// 			const gridData = buildTreeBoundaryGrid(treeData, size, 8)
// 			const doorGrids = Object.values(levelEntitiesData).filter(e => e.tags?.doorDungeon).map((e) => {
// 				const box = getDoorBoundaries(e)
// 				const treesWithDoor = treeData.filter(t => !box.containsPoint(new Vector2(t.position.x, t.position.z)))
// 				return {
// 					direction: e.tags?.doorDungeon,
// 					grid: buildTreeBoundaryGrid(treesWithDoor, size, 8),
// 					box,
// 				}
// 			})
// 			grid?.removeFromParent()
// 			const newGridData = mergeGrids(gridData, ...doorGrids.map(dg => dg.grid))
// 			grid = visualizeGrid(newGridData)
// 			scene.add(grid)
// 			const newTreeGroup = new Group()
// 			for (let i = 0; i < trees.length; i++) {
// 				if (!trees[i]) continue
// 				const modelName = models[i]

// 				instances[modelName] ??= {
// 					category: 'trees',
// 					model: modelName,
// 					entities: [],
// 				}
// 				const instancedModel = new InstancedModel(SkeletonUtils.clone((assets.trees[modelName] as any).scene))
// 				for (const tree of trees[i]) {
// 					instancedModel.addInstance(tree.matrix)
// 					const treeData = getTreeData(i, tree.position)
// 					const entity: InstanceEntity = {
// 						position: tree.position,
// 						rotation: tree.rotation,
// 						scale: tree.scale,
// 						collider: isInBoundaryCell(treeData.position, treeData.radius, newGridData),
// 						transparent: tree.transparent,
// 						doorDungeon: doorGrids.find(d => d.box.containsPoint(new Vector2(tree.position.x, tree.position.z)))?.direction as Direction,
// 					}
// 					instances[modelName].entities.push(entity)
// 				}
// 				newTreeGroup.add(instancedModel.build())
// 			}

// 			treeGroup?.removeFromParent()
// 			treeGroup = newTreeGroup
// 			group.add(treeGroup)
// 		}
// 	}))
// 	const grassNoise = createMemo(() => {
// 		const levelSizeValue = levelSize()
// 		if (!levelSizeValue || floorTexture() !== 'grass') return
// 		const renderer = new WebGLRenderer()
// 		renderer.setSize(levelSizeValue.x * 10, levelSizeValue.y * 10)
// 		const quad = new FullScreenQuad(new ShaderMaterial({
// 			vertexShader: /* glsl */`
// 			varying vec2 vUv;
// 			void main() {
// 				vUv = uv;
// 				vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
// 				gl_Position = projectionMatrix * modelViewPosition;
// 			}`,
// 			fragmentShader: /* glsl */`
// 			${FastNoiseLiteSrc}
// 			varying vec2 vUv;
// 			void main() {
// 				fnl_state noise = fnlCreateState(1337);
// 				noise.noise_type = FNL_NOISE_CELLULAR;
// 				noise.frequency = 0.02;
// 				noise.cellular_return_type = FNL_CELLULAR_RETURN_TYPE_CELLVALUE;
// 				noise.domain_warp_type = FNL_DOMAIN_WARP_OPENSIMPLEX2;
// 				noise.domain_warp_amp = 100.;
// 				noise.fractal_type = FNL_FRACTAL_DOMAIN_WARP_INDEPENDENT;
// 				float x = vUv.x * ${levelSizeValue.x}.;
// 				float y = vUv.y * ${levelSizeValue.y}.;
// 				fnlDomainWarp2D(noise, x, y);
// 				noise.frequency = 0.015;
// 				float n = fnlGetNoise2D(noise, x, y);
// 				n = (n *0.5)+0.5;
// 				gl_FragColor = vec4(vec3(n),1.);
// 			}
// 			`,
// 		}))
// 		quad.render(renderer)
// 		const selectedLevelValue = selectedLevel()
// 		if (!selectedLevelValue) return
// 		// saveImage(selectedLevelValue, 'GrassNoise', renderer.domElement, localFolder())
// 		return renderer.domElement
// 	})

// 	let grassModel: Object3D | null = null
// 	createEffect(on(grassCanvas, (gCanvas) => {
// 		grassModel?.removeFromParent()
// 		const hCanvas = heightCanvas()
// 		const scale = displacementScale()
// 		const size = levelSize()

// 		const grassNoiseValue = grassNoise()
// 		const noiseTex = grassNoiseValue ? texture(new CanvasTexture(grassNoiseValue)) : null
// 		const bladeTex = texture(assets.textures.grass)
// 		if (!scale || !size || !gCanvas || !noiseTex) return
// 		const grass = getGrass(hCanvas, gCanvas, 2, scale)
// 		if (grass.length === 0) return
// 		const bladeWidth = 4
// 		const bladeHeight = 4
// 		const geo = new PlaneGeometry(bladeWidth, bladeHeight)
// 		geo.translate(0, bladeHeight / 2, 0)

// 		const mat = new SpriteNodeMaterial({
// 			transparent: true,
// 			map: assets.textures.grass,
// 		})
// 		const positionData = new Float32Array(grass.flatMap(({ position }) => [position.x, position.y, position.z]))
// 		const positionAttribute = new InstancedBufferAttribute(positionData, 3)
// 		const instancePos = instancedBufferAttribute(positionAttribute)
// 		mat.positionNode = instancePos
// 		const grassSample = texture(bladeTex, uv())

// 		const noiseUV = positionLocal.xz.div(vec2(size)).add(0.5)
// 		const topColor = color(0x5AB552)
// 		const grassColor = color(0x26854C)
// 		const noiseTint = noiseTex.sample(noiseUV).r
// 		const grassC = mix(grassColor, topColor, noiseTint)
// 		mat.colorNode = vec4(grassC.rgb, grassSample.a)
// 		const mesh = new InstancedMesh(geo, mat, grass.length)

// 		mesh.instanceMatrix.needsUpdate = true
// 		grassModel = mesh

// 		scene.add(grassModel)
// 	}))

// 	createEffect(() => {
// 		const floorTextureValue = floorTexture()
// 		const size = levelSize()
// 		const canvas = pathCanvas()
// 		if (!size || !canvas || !floorTextureValue) return
// 		const level = new CanvasTexture(canvas)
// 		const grassNoiseValue = grassNoise()
// 		const grassNoiseTexture = grassNoiseValue ? new CanvasTexture(grassNoiseValue) : null
// 		if (grassNoiseTexture) {
// 			grassNoiseTexture.flipY = false
// 			groundMesh.material = getGroundMaterial(floorTextureValue, {
// 				size,
// 				planksTexture: assets.textures.planks,
// 				groundTexture: assets.textures.Dirt4_Dark,
// 				rockTexture: assets.textures.Rocks1_Light,
// 				level,
// 				grassNoiseTexture,
// 			})
// 		}
// 	})
// 	createEffect(on(waterCanvas, (canvas) => {
// 		const size = levelSize()
// 		if (!size || !canvas) return
// 		waterMesh.material = new WaterMaterial({ map: new CanvasTexture(canvas) }, size)
// 	}))

// 	t.addEventListener('axis-changed', (e) => {
// 		mapControls.enabled = e.value === null && mode() === 'level'
// 		orbitControls.enabled = e.value === null && mode() === 'entity'
// 		const id = selectedId()
// 		if (e.value === null && id) {
// 			levelEntitiesData[id].position = levelEntities[id].position.toArray()
// 			levelEntitiesData[id].scale = levelEntities[id].scale.clone().divide(getGlobalScale(id)).toArray()
// 			levelEntitiesData[id].rotation = new Quaternion().setFromEuler(levelEntities[id].rotation).toArray()
// 			groundEntity(id)
// 		}
// 	})

// 	const groundUV = atom<Vector2 | null>(null)

// 	const mouseRay = new Raycaster()
// 	const getMousePosition = (e: PointerEvent) => {
// 		const box = renderer.domElement.getBoundingClientRect()
// 		if (e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
// 			return {
// 				x: ((e.clientX - box.left) / (box.right - box.left)) * 2 - 1,
// 				y: -((e.clientY - box.top) / (box.bottom - box.top)) * 2 + 1,
// 			}
// 		}
// 		return null
// 	}
// 	let mousePosition: null | Vector2Like = null
// 	window.addEventListener('pointermove', (e) => {
// 		mousePosition = getMousePosition(e)
// 		drawing(e.ctrlKey)
// 	})
// 	const updateTempModelPosition = () => {
// 		const model = tempModel()
// 		if (mousePosition) {
// 			if (model || drawing()) {
// 				mouseRay.setFromCamera(new Vector2(mousePosition.x, mousePosition.y), camera)
// 				const intersection = mouseRay.intersectObject(groundMesh)
// 				if (intersection[0]) {
// 					if (model) {
// 						model.visible = true
// 						model.position.copy(intersection[0].point)
// 					} else {
// 						groundUV(new Vector2(intersection[0].uv!.x, 1 - intersection[0].uv!.y))
// 					}
// 				}
// 			}
// 		}
// 	}

// 	createEffect(on(model, (obj) => {
// 		if (obj && mode() === 'level') {
// 			tempModel()?.removeFromParent()
// 			const cloneModel = SkeletonUtils.clone(obj)
// 			scene.add(cloneModel)
// 			cloneModel.visible = false
// 			const category = selectedCategory()
// 			const asset = selectedAsset()
// 			if (category && asset) {
// 				const globalScale = boundingBox?.[category]?.[asset]?.scale
// 				if (globalScale) {
// 					cloneModel.scale.multiply(new Vector3(...globalScale))
// 				}
// 			}
// 			tempModel(cloneModel)
// 		}
// 	}))

// 	const onPointerDown = (e: PointerEvent) => {
// 		const pos = getMousePosition(e)
// 		if (navMesh && pos) {
// 			const ray = new Raycaster()
// 			ray.setFromCamera(new Vector2(pos.x, pos.y), camera)
// 			// group.visible = false
// 			navMeshHelperObj?.removeFromParent()
// 			helperGroup.children.forEach(c => c.removeFromParent())
// 			floodFill(scene, ray, navMesh)
// 			completeNavMesh(navMesh)
// 		}
// 		if (mode() === 'level' && !drawing()) {
// 			if (e.buttons === 1) {
// 				const model = tempModel()
// 				const category = selectedCategory()
// 				const asset = selectedAsset()
// 				if (model && category && asset) {
// 					const entity = SkeletonUtils.clone(model)
// 					scene.add(entity)
// 					const id = generateUUID()
// 					levelEntities[id] = entity

// 					levelEntitiesData[id] = {
// 						category,
// 						model: asset,
// 						scale: [1, 1, 1],
// 						position: entity.position.toArray(),
// 						grounded: true,
// 						rotation: new Quaternion().setFromEuler(entity.rotation).toArray(),
// 					}
// 				} else if (pos && !selectedId()) {
// 					const ray = new Raycaster()
// 					ray.setFromCamera(new Vector2(pos.x, pos.y), camera)
// 					for (const key in levelEntities) {
// 						const entity = levelEntities[key]
// 						if (ray.intersectObject(entity, true).length > 0) {
// 							selectedId(key)
// 							return
// 						}
// 					}
// 				}
// 			} else {
// 				selectedAsset(null)
// 				selectedId(null)
// 			}
// 		}
// 	}
// 	createEffect(on(selectedId, (id) => {
// 		if (!id) {
// 			t.detach()
// 		} else {
// 			const entity = levelEntities[id]
// 			t.attach(entity)
// 			transformControlsMode('translate')
// 			scene.add(t.getHelper())
// 			selectedCategory(levelEntitiesData[id].category)
// 		}
// 	}))
// 	const scaleLock = atom(true)
// 	const changeMode = (e: KeyboardEvent) => {
// 		if (!selectedId()) return
// 		switch (e.key) {
// 			case 'g':return	transformControlsMode('translate')
// 			case 's':	{
// 				const id = selectedId()
// 				if (id) {
// 					const scale = levelEntitiesData[id].scale
// 					scaleLock(scale[0] === scale[1] && scale[0] === scale[2])
// 				}
// 				transformControlsMode('scale')
// 				return
// 			}
// 			case 'r':return	transformControlsMode('rotate')
// 		}
// 	}
// 	createEffect(() => t.setMode(transformControlsMode()))

// 	const setMaxScale = () => {
// 		const t = transformControls as any
// 		if (t.axis && t.getMode() === 'scale' && scaleLock() && mode() === 'level') {
// 			const axis = [...t.axis?.toLowerCase()].filter(axis => ['x', 'y', 'z'].includes(axis)) as Array<'x' | 'y' | 'z'>
// 			const max = Math.max(...axis.map(axis => t.object?.scale[axis] ?? 0))
// 			t.object?.scale.setScalar(max)
// 		}
// 	}
// 	createEffect(on(scaleLock, setMaxScale))
// 	t.addEventListener('change', setMaxScale)
// 	onMount(() => window.addEventListener('keydown', changeMode))
// 	onCleanup(() => window.removeEventListener('keydown', changeMode))

// 	createEffect(on(selectedAsset, (asset) => {
// 		if (!asset) {
// 			tempModel()?.removeFromParent()
// 			tempModel(null)
// 		}
// 		selectedId(null)
// 	}))

// 	const levelData = createMemo<LevelData | null>(() => {
// 		const size = levelSize()
// 		const scale = displacementScale()
// 		const floorTextureValue = floorTexture()

// 		trackDeep(levelEntitiesData)
// 		trackDeep(instances)
// 		if (size && scale && !loading() && floorTextureValue) {
// 			return {
// 				sizeX: size.x,
// 				sizeY: size.y,
// 				entities: unwrap(levelEntitiesData),
// 				displacementScale: scale,
// 				floorTexture: floorTextureValue,
// 				instances: unwrap(instances),
// 				navMesh: completeNavMesh(),
// 			}
// 		}
// 		return null
// 	})

// 	const updateEntity = (id: string, init = false) => {
// 		const entityData = levelEntitiesData[id]
// 		const model = entities?.[entityData.category]?.[entityData.model]
// 		if (model) {
// 			let existingEntity = levelEntities[id]
// 			if (!existingEntity) {
// 				const model = entities?.[entityData.category]?.[entityData.model]

// 				const cloned = SkeletonUtils.clone(model)

// 				const obj = new CSS2DObject(document.createElement('div'))
// 				tagsContainers[id] = obj
// 				cloned.add(obj)
// 				group.add(cloned)

// 				levelEntities[id] = cloned
// 				existingEntity = cloned
// 			}
// 			existingEntity.position.fromArray(entityData.position)
// 			existingEntity.rotation.setFromQuaternion(new Quaternion().fromArray(entityData.rotation))

// 			existingEntity.scale.copy(new Vector3(...entityData.scale).multiply(getGlobalScale(id)))
// 			if (entityData.grid && (entityData.grid.repetitionX > 0 || entityData.grid.repetitionY > 0)) {
// 				repetitions[id] ??= {}
// 				const prevData = repetitions[id]
// 				const newData: Record<string, Object3D> = {}
// 				for (let x = 0; x <= entityData.grid.repetitionX; x++) {
// 					for (let y = 0; y <= entityData.grid.repetitionY; y++) {
// 						if (!(x === 0 && y === 0)) {
// 							const key = `${x}-${y}`
// 							prevData[key] ??= SkeletonUtils.clone(model)
// 							newData[key] = prevData[key]
// 							const repetition = newData[key]
// 							existingEntity.add(repetition)
// 							repetition.position.set(entityData.grid.spacingX * x, 0, entityData.grid.spacingY * y)
// 							delete prevData[key]
// 						}
// 					}
// 				}
// 				Object.values(prevData).forEach(o => o.removeFromParent())
// 				repetitions[id] = newData
// 			} else {
// 				Object.values(repetitions[id] ?? {}).forEach(o => o.removeFromParent())
// 			}
// 			if (init) {
// 				groundEntity(id)
// 			}
// 		}
// 	}

// 	const removeEntity = (id: string) => {
// 		selectedId(null)
// 		levelEntities[id].removeFromParent()
// 		delete levelEntitiesData[id]
// 		delete levelEntities[id]
// 	}

// 	const fetchLevel = async (levelName: string) => {
// 		loading(true)

// 		scene.clear()
// 		for (const id in levelEntities) {
// 			removeEntity(id)
// 		}
// 		for (const tagContainer of Object.values(tagsContainers)) {
// 			tagContainer.remove()
// 		}
// 		setSelectedLevel(null)
// 		displacementScale(null)
// 		completeNavMesh(null)
// 		treeCanvas(null)
// 		heightCanvas(null)
// 		pathCanvas(null)
// 		waterCanvas(null)
// 		grassCanvas(null)
// 		modifyMutable(instances, reconcile({}))
// 		modifyMutable(tagsContainers, reconcile({}))
// 		modifyMutable(levelEntitiesData, reconcile({}))
// 		const data = await loadLevel(levelName)
// 		for (const map of ['heightMap', 'treeMap', 'pathMap', 'waterMap']) {
// 			const img = await loadImage(data[map])
// 			const canvas = imgToCanvas(img).canvas
// 			saveImage(levelName, map, canvas, localFolder())
// 		}
// 		floorTexture(data.floorTexture)
// 		setSelectedLevel(levelName)
// 		displacementScale(data.displacementScale)

// 		levelSize(new Vector2(data.sizeX, data.sizeY))
// 		completeNavMesh(data.navMesh)
// 		orbitControls.enabled = false
// 		mapControls.enabled = true
// 		scene.add(camera)
// 		camera.lookAt(new Vector3())
// 		camera.updateProjectionMatrix()
// 		scene.add(group)

// 		modifyMutable(levelEntitiesData, reconcile(data.entities))
// 		setMode('level')
// 		for (const id in levelEntitiesData) {
// 			updateEntity(id, false)
// 		}
// 		loading(false)
// 		redrawEvent.emit()
// 	}

// 	createEffect(() => {
// 		if (!openEditor()) {
// 			drawing(false)
// 		}
// 	})
// 	createEffect(() => {
// 		if (!drawing()) {
// 			pointerMesh.material.opacity = 0
// 		}
// 	})
// 	const mouse = (canvas: HTMLCanvasElement | null) => {
// 		if (canvas) {
// 			pointerMesh.material.map = new CanvasTexture(canvas)
// 			pointerMesh.material.opacity = 0.5
// 		} else {
// 			pointerMesh.material.opacity = 0
// 		}
// 		pointerMesh.material.needsUpdate = true
// 	}

// 	const globalMode = atom<'brush' | 'eraser' | null>(null)
// 	createEffect<boolean>((prev) => {
// 		if (globalMode()) {
// 			const wasEnabled = mapControls.enabled
// 			mapControls.enabled = false
// 			return wasEnabled
// 		} else {
// 			mapControls.enabled = prev
// 		}
// 		return prev
// 	}, mapControls.enabled)

// 	createEffect(on(drawing, (drawing) => {
// 		if (drawing) {
// 			selectedId(null)
// 			selectedAsset(null)
// 		}
// 	}))

// 	const resetScale = () => {
// 		const id = selectedId()
// 		if (id) {
// 			levelEntities[id].scale.setScalar(1).multiply(getGlobalScale(id))
// 			levelEntitiesData[id].scale = [1, 1, 1]
// 		}
// 	}
// 	const resetGlobalScale = () => {
// 		const id = selectedId()
// 		if (id) {
// 			const entity = levelEntitiesData[id]
// 			boundingBox[entity.category][entity.model].scale = [1, 1, 1]
// 			for (const [otherId, otherEntity] of Object.entries(levelEntitiesData)) {
// 				if (otherEntity.category === entity.category && otherEntity.model === entity.model) {
// 					levelEntities[otherId].scale.fromArray(levelEntitiesData[otherId].scale)
// 				}
// 			}
// 		}
// 	}
// 	const applyGlobalScale = () => {
// 		const id = selectedId()

// 		if (id) {
// 			const entity = levelEntitiesData[id]
// 			const model = levelEntities[id]
// 			const scale = model.scale.clone()
// 			boundingBox[entity.category] ??= {}
// 			boundingBox[entity.category][entity.model] ??= {}
// 			boundingBox[entity.category][entity.model].scale = scale.toArray()
// 			entity.scale = [1, 1, 1]
// 			model.scale.setScalar(1)
// 			for (const [otherId, otherEntity] of Object.entries(levelEntitiesData)) {
// 				if (otherEntity.category === entity.category && otherEntity.model === entity.model) {
// 					levelEntities[otherId].scale.copy(new Vector3(...levelEntitiesData[otherId].scale).multiply(getGlobalScale(otherId)))
// 				}
// 			}
// 		}
// 	}
// 	const listenToRemoveEntity = (e: KeyboardEvent) => {
// 		if (e.key === 'Delete') {
// 			const id = selectedId()
// 			if (id) removeEntity(id)
// 		}
// 	}
// 	onMount(() => window.addEventListener('keydown', listenToRemoveEntity))
// 	onCleanup(() => window.removeEventListener('keydown', listenToRemoveEntity))

// 	const assetInMap = createMemo(() => {
// 		const id = selectedId()
// 		if (id) {
// 			return levelEntitiesData[id].model
// 		}
// 		return null
// 	})

// 	const hoveredEntity = atom<string | null>(null)

// 	const saveLevelDebounced = debounce((levelName: string, data: LevelData) => set(levelName, data), 1000)
// 	const saveLevelLocal = () => {
// 		const levelName = selectedLevel()
// 		const data = unwrap(levelData())
// 		if (levelName && data && loaded()) {
// 			saveLevelDebounced(levelName, data)
// 		}
// 	}
// 	createEffect(on(levelData, () => {
// 		saveLevelLocal()
// 	}))

// 	const saveLevel = async () => {
// 		const boundingBoxData = await get('boundingBox')
// 		await saveBoundingBox(boundingBoxData, localFolder())
// 		const levelName = selectedLevel()
// 		if (levelName) {
// 			const data = await get(levelName)
// 			await saveLevelFile(levelName, data, localFolder())
// 		}
// 	}

// 	const saveBoundingBoxDebounced = debounce(async () => {
// 		if (loaded()) {
// 			await set('boundingBox', unwrap(boundingBox))
// 		}
// 	}, 500)
// 	createEffect(() => {
// 		trackDeep(boundingBox)
// 		saveBoundingBoxDebounced()
// 	})
// 	const saveTagsListfn = (tags: EditorTags) => {
// 		tagsList(tags)
// 		saveTagsList(tags, localFolder())
// 	}

// 	const fetchLevels = async () => {
// 		const dirs = await loadLevels() as { name: string }[]
// 		levels(dirs.map(d => d.name))
// 		if (levels().length !== 0) {
// 			await fetchLevel(selectedLevel() ?? levels()[0])
// 		}
// 	}
// 	const fetchBoundingBox = async () => {
// 		// let data = await get('boundingBox')
// 		const data = await loadBoundingBox()
// 		modifyMutable(boundingBox, reconcile(data))
// 	}
// 	const fetchTagsList = async () => {
// 		const tags = await loadTagsList()
// 		tagsList(tags)
// 	}

// 	const repoCloned = atom(false)
// 	const reload = async () => {
// 		loaded(false)
// 		setSelectedLevel(null)
// 		for (const id in levelEntities) {
// 			removeEntity(id)
// 		}
// 		scene.clear()
// 		await createFolder()
// 		const repo = await isRepoCloned()
// 		repoCloned(repo)
// 		if (repo) {
// 			await fetchBoundingBox()
// 			await fetchTagsList()
// 			await fetchLevels()
// 		}
// 		loaded(true)
// 	}

// 	onMount(() => {
// 		reload()
// 	})
// 	renderer.setAnimationLoop(() => {
// 		if (mode() === 'entity') {
// 			world.step()
// 			debugRenderer?.update()
// 		}
// 		updateTempModelPosition()
// 		renderer.render(scene, camera)
// 		cssRenderer.render(scene, camera)
// 	})

// 	const duplicate = () => {
// 		const id = selectedId()
// 		if (id) {
// 			const clone = structuredClone(unwrap(levelEntitiesData[id]))
// 			const newId = generateUUID()
// 			levelEntitiesData[newId] = clone
// 			updateEntity(newId)
// 		}
// 	}
// 	const getOffsetX = (anchorX: AnchorX, newWidth: number, oldWidth: number) => {
// 		switch (anchorX) {
// 			case 'left': return 0
// 			case 'center': return Math.floor((newWidth - oldWidth) / 2)
// 			case 'right': return newWidth - oldWidth
// 		}
// 	}
// 	const getOffsetY = (anchorX: AnchorY, newHeight: number, oldHeight: number) => {
// 		switch (anchorX) {
// 			case 'top': return 0
// 			case 'center': return Math.floor((newHeight - oldHeight) / 2)
// 			case 'bottom': return newHeight - oldHeight
// 		}
// 	}
// const resize = (anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vector2Like) => {
// 	const oldSize = levelSize()
// 	if (!oldSize) return
// 	const tempCanvas = document.createElement('canvas') as HTMLCanvasElement
// 	tempCanvas.width = size.x
// 	tempCanvas.height = size.y
// 	const ctx = tempCanvas.getContext('2d')!
// 	const offsetX = getOffsetX(anchorX, size.x, oldSize.x)
// 	const offsetY = getOffsetY(anchorY, size.y, oldSize.y)
// 	for (const canvas of [treeCanvas, pathCanvas, heightCanvas, grassCanvas, waterCanvas]) {
// 		ctx.clearRect(0, 0, size.x, size.y)
// 		const canvasValue = canvas()
// 		if (!canvasValue) continue
// 		if (mode === 'extend') {
// 			ctx.drawImage(canvasValue, offsetX, offsetY, oldSize.x, oldSize.y)
// 		} else {
// 			ctx.drawImage(canvasValue, 0, 0, size.x, size.y)
// 		}
// 		canvasValue.width = size.x
// 		canvasValue.height = size.y
// 		canvasValue.getContext('2d')!.drawImage(tempCanvas, 0, 0, size.x, size.y)
// 		canvas(canvasValue)
// 	}
// 	levelSize(new Vector2(size.x, size.y))
// 	redrawEvent.emit()
// 	const { x: ow, y: oh } = oldSize
// 	const { x: nw, y: nh } = size

// 	const ox = anchorX === 'left' ? 0 : anchorX === 'right' ? nw - ow : (nw - ow) / 2
// 	const oy = anchorY === 'top' ? 0 : anchorY === 'bottom' ? nh - oh : (nh - oh) / 2

// 	const ocx = ow / 2
// 	const ocy = oh / 2
// 	const ncx = nw / 2
// 	const ncy = nh / 2
// 	for (const key in levelEntitiesData) {
// 		const [x, y, z] = levelEntitiesData[key].position
// 		if (mode === 'extend') {
// 			const newX = (x + ocx + ox) - ncx
// 			const newZ = (z + ocy + oy) - ncy
// 			levelEntitiesData[key].position = [newX, y, newZ]
// 		}
// 		else {
// 			const sx = nw / ow
// 			const sy = nh / oh
// 			const newX = ((x + ocx) * sx) - ncx
// 			const newZ = ((z + ocy) * sy) - ncy
// 			levelEntitiesData[key].position = [newX, y, newZ]
// 		}
// 		updateEntity(key)
// 	}
// }

// 	css/* css */`
// 	.hidden{
// 		display: none
// 	}
// 	.editor{
// 		height: calc(100dvh - 1rem);
// 		padding: 0.5rem;
// 		display: grid;
// 		grid-template-rows: 4fr 1fr
// 	}
// 	.top{
// 		display: grid;
// 		grid-template-columns: 1fr 5fr 1fr;
// 		overflow-y: hidden;
// 		gap:0.5rem;
// 		margin-bottom: 0.5rem;
// 	}
// 	.map-editors{
// 		height: 100%;
// 		overflow-y: auto;
// 	}
// 	.left{
// 		height: 100%;
// 		overflow-y: auto;
// 	}
// 	.renderer-container{
// 		border-radius: 1rem;
// 		position: relative;
// 		overflow: hidden;
// 		border: solid 3px var(--color-2);
// 		z-index: 0;
// 	}
// 	.mode-buttons{
// 		position: absolute;
// 		left: 1rem;
// 		top: 1rem;
// 		display: flex;
// 		flex-direction: column;
// 		align-items: flex-start;
// 		gap: 0.5rem;
// 	}
// 	.scale-buttons{
// 		display: flex;
// 		gap: 0.5rem;
// 	}
// 	.tag{
// 		padding: 0 .2rem;
//     	font-size: .7rem;
// 		border-radius:0.1rem;
// 	}
// 	.global-tag{
// 		background: var(--global-tag-color);
// 	}
// 	.entity-tag{
// 		background: var(--entity-tag-color);
// 	}
// 	.indicator-arrow{
// 		color: yellow;
// 		font-size: 2rem;
// 		transform: rotate(-45deg);
// 		position: absolute;
// 	}
// 	:global(.indicator-arrow svg) {
// 		stroke: black;
// 		stroke-width: 1.5em;
// 	}
//   	`

// 	return (

// 		<Show when={Object.keys(entities).length > 0}>
// 			<div class="editor">
// 				<div class="top">
// 					<div class="left">
// 						<Configuration
// 							reload={reload}
// 							repoCloned={repoCloned}
// 							saveLevel={saveLevel}
// 							localFolder={localFolder}
// 							setLocalFolder={setLocalFolder}
// 						/>
// 						<Show when={!selectedId()}>
// 							<LevelSelector
// 								fetchLevels={fetchLevels}
// 								levels={levels}
// 								loadLevel={fetchLevel}
// 								selectedLevel={selectedLevel}
// 								localFolder={localFolder}
// 							/>
// 						</Show>
// 						<Show when={mode() === 'level'}>
// 							<Show when={!selectedId()}>
// 								<LevelProps
// 									addNavMesh={addNavMesh}
// 									resize={resize}
// 									levelSize={levelSize}
// 									floorTexture={floorTexture}
// 									displayNavMesh={displayNavMesh}
// 								/>
// 							</Show>
// 							<Show when={selectedId() && tagsList()}>
// 								<TagsEditor
// 									tagsList={tagsList}
// 									tags={localTags}
// 									saveTagsList={saveTagsListfn}
// 									global={false}
// 								/>
// 								<TagsEditor
// 									tagsList={tagsList}
// 									tags={tags}
// 									saveTagsList={saveTagsListfn}
// 								/>
// 							</Show>
// 							<EntityList
// 								tagsList={tagsList}
// 								saveTagsList={saveTagsListfn}
// 								selectedId={selectedId}
// 								hoveredEntity={hoveredEntity}
// 								levelEntitiesData={levelEntitiesData}
// 								removeEntity={removeEntity}
// 							/>
// 							<For each={Object.entries(tagsContainers)}>
// 								{([id, el]) => {
// 									const entity = levelEntitiesData[id]
// 									const globalTags = createMemo(() => entries(boundingBox?.[entity.category]?.[entity.model]?.tags ?? {}))
// 									const entityTags = createMemo(() => entries(levelEntitiesData[id]?.tags ?? {}))
// 									return (
// 										<Portal mount={el.element}>
// 											<div style="position:relative; display: flex;gap: 0.2rem; flex-direction: column">
// 												<Show when={id === hoveredEntity()}>
// 													<div class="indicator-arrow">
// 														<Fa icon={faLocationArrow}></Fa>
// 													</div>
// 												</Show>
// 												<For each={globalTags()}>
// 													{([tag, val]) => (
// 														<div class="tag global-tag">
// 															{tag}
// 															{val === true ? '' : ` ${val}`}
// 														</div>
// 													)}
// 												</For>
// 												<For each={entityTags()}>
// 													{([tag, val]) => (
// 														<div class="tag entity-tag">
// 															{tag}
// 															{val === true ? '' : ` ${val}`}
// 														</div>
// 													)}
// 												</For>
// 											</div>
// 										</Portal>
// 									)
// 								}}
// 							</For>
// 						</Show>
// 					</div>
// 					<div
// 						class="renderer-container"
// 						onPointerDown={e => drawing() && globalMode(e.buttons === 1 ? 'brush' : 'eraser')}
// 						onPointerLeave={() => {
// 							groundUV(null)
// 							globalMode(null)
// 						}}
// 						onPointerUp={() => {
// 							groundUV(null)
// 							globalMode(null)
// 						}}
// 						onContextMenu={e => e.preventDefault()}
// 					>
// 						<Renderer renderer={renderer} camera={camera} onPointerDown={onPointerDown} cssRenderer={cssRenderer} />

// 						<Show when={selectedId() || mode() === 'entity'}>
// 							<div class="mode-buttons">
// 								<div class="scale-buttons">
// 									<button onClick={() => transformControlsMode('scale')} classList={{ selected: transformControlsMode() === 'scale' }}>
// 										<Fa icon={faMaximize}></Fa>
// 										{' '}
// 										(S)
// 									</button>
// 									<Show when={selectedId()}>
// 										<button onClick={() => scaleLock(!scaleLock())}>
// 											<Fa icon={scaleLock() ? faLock : faLockOpen}></Fa>
// 											{' '}
// 											Lock scale axis
// 										</button>
// 										<button onClick={applyGlobalScale}>
// 											<Fa icon={faEarth}></Fa>
// 											{' '}
// 											Apply to all
// 										</button>

// 									</Show>
// 								</div>
// 								<button onClick={() => transformControlsMode('translate')} classList={{ selected: transformControlsMode() === 'translate' }}>
// 									<Fa icon={faArrowsUpDownLeftRight}></Fa>
// 									{' '}
// 									(G)
// 								</button>
// 								<button onClick={() => transformControlsMode('rotate')} classList={{ selected: transformControlsMode() === 'rotate' }}>
// 									<Fa icon={faArrowsRotate}></Fa>
// 									{' '}
// 									(R)
// 								</button>
// 							</div>
// 						</Show>
// 					</div>

// 					<div class="map-editors">
// 						<Show when={mode() === 'entity' && selectedCategory()}>
// 							{category => (
// 								<Show when={selectedAsset()}>
// 									{asset =>	(
// 										<ModelColliders
// 											selectedAsset={asset}
// 											selectedCategory={category}
// 											scene={scene}
// 											world={world}
// 											transformControls={t}
// 											model={model}
// 											boundingBox={boundingBox}
// 										/>
// 									)}
// 								</Show>
// 							)}
// 						</Show>
// 						<Show when={selectedId()}>
// 							{(id) => {
// 								const entity = levelEntitiesData[id()]
// 								const assetData = boundingBox?.[entity.category]?.[entity.model]
// 								return (
// 									<SelectedEntityProps
// 										duplicate={duplicate}
// 										assetData={assetData}
// 										destroy={() => removeEntity(id())}
// 										entity={levelEntitiesData[id()]}
// 										update={() => updateEntity(id(), false)}
// 										applyGlobalScale={applyGlobalScale}
// 										scaleLock={scaleLock}
// 										resetScale={resetScale}
// 										resetGlobalScale={resetGlobalScale}
// 									/>
// 								)
// 							}}
// 						</Show>
// 						<Show when={mode() === 'level' && levelSize()}>
// 							{size => (
// 								<div classList={{ hidden: Boolean(selectedId()) }}>
// 									<MapEditor
// 										redrawEvent={redrawEvent}
// 										selectedLevel={selectedLevel}
// 										name="Height map"
// 										drawing={drawing}
// 										mouseCanvas={mouse}
// 										setCanvas={heightCanvas}
// 										levelSize={size}
// 										open={openEditor}
// 										eraseColor="black"
// 										realTimeUpdate={false}
// 										globalMode={globalMode}
// 										globalPosition={groundUV}
// 										localFolder={localFolder}
// 									>
// 										{(color) => {
// 											const height = atom(1)
// 											createEffect(() => color(`hsl(0deg,0%,${height()}%)`))
// 											return (
// 												<>
// 													<RangeInput value={height} name="Height" max={100} />
// 													<RangeInput name="Displacement scale" value={displacementScale} min={0} />
// 												</>
// 											)
// 										}}
// 									</MapEditor>
// 									<MapEditor
// 										redrawEvent={redrawEvent}
// 										name="Trees"
// 										drawing={drawing}
// 										selectedLevel={selectedLevel}
// 										mouseCanvas={mouse}
// 										setCanvas={treeCanvas}
// 										levelSize={size}
// 										transparency={false}
// 										blur={false}
// 										realTimeUpdate={false}
// 										defaultColor="#00FF00"
// 										open={openEditor}
// 										globalMode={globalMode}
// 										globalPosition={groundUV}
// 										localFolder={localFolder}
// 									>
// 										{(color) => {
// 											css/* css */`
// 													.color-buttons{
// 														display: grid;
// 														grid-template-columns: 1fr 1fr;
// 													}
// 													.square{
// 														width: 0.8rem;
// 														aspect-ratio: 1;
// 														display: inline-block;
// 														margin-right: 0.2rem;
// 													}
// 													.green{
// 														background: #00FF00
// 													}
// 													.red{
// 														background: #FF0000
// 													}
// 													`
// 											return (
// 												<div class="color-buttons">
// 													<button onClick={() => color('#00FF00')} classList={{ selected: color() === '#00FF00' }}>
// 														<div class="square green" />
// 														Trees
// 													</button>
// 													<button onClick={() => color('#FF0000')} classList={{ selected: color() === '#FF0000' }}>
// 														<div class="square red" />
// 														Transparent Trees
// 													</button>
// 												</div>
// 											)
// 										}}
// 									</MapEditor>
// 									<MapEditor
// 										redrawEvent={redrawEvent}
// 										selectedLevel={selectedLevel}
// 										drawing={drawing}
// 										mouseCanvas={mouse}
// 										name="Path"
// 										setCanvas={pathCanvas}
// 										levelSize={size}
// 										transparency={true}
// 										blur={true}
// 										defaultColor="#FF0000"
// 										open={openEditor}
// 										globalMode={globalMode}
// 										globalPosition={groundUV}
// 										localFolder={localFolder}
// 									/>
// 									<MapEditor
// 										redrawEvent={redrawEvent}
// 										selectedLevel={selectedLevel}
// 										drawing={drawing}
// 										mouseCanvas={mouse}
// 										name="Water"
// 										setCanvas={waterCanvas}
// 										levelSize={size}
// 										transparency={false}
// 										blur={false}
// 										defaultColor="#0000FF"
// 										open={openEditor}
// 										realTimeUpdate={false}
// 										globalMode={globalMode}
// 										globalPosition={groundUV}
// 										localFolder={localFolder}
// 									/>
// 									<MapEditor
// 										redrawEvent={redrawEvent}
// 										selectedLevel={selectedLevel}
// 										drawing={drawing}
// 										mouseCanvas={mouse}
// 										name="Grass"
// 										setCanvas={grassCanvas}
// 										levelSize={size}
// 										transparency={false}
// 										blur={false}
// 										realTimeUpdate={false}
// 										defaultColor="#00FF00"
// 										open={openEditor}
// 										globalMode={globalMode}
// 										globalPosition={groundUV}
// 										localFolder={localFolder}
// 									/>
// 								</div>
// 							)}
// 						</Show>
// 					</div>
// 				</div>
// 				<Show when={objectKeys(entities).length !== 0}>
// 					<EntitySelector
// 						boundingBox={boundingBox}
// 						thumbnailRenderer={thumbnailRenderer}
// 						setMode={setMode}
// 						model={model}
// 						entities={entities}
// 						selectedCategory={selectedCategory}
// 						selectedAsset={selectedAsset}
// 						assetInMap={assetInMap}
// 					/>
// 				</Show>
// 			</div>
// 		</Show>

// 	)
// }

// export default Editor
