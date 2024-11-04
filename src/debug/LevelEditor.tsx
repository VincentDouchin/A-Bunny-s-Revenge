import type { Entity } from '@/global/entity'
import type { NavCell } from '@/lib/navGrid'
import type { fruit_trees, gardenPlots, models, vegetation, village } from '@assets/assets'
import type { RigidBodyType } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { customModel, PlacableProp } from './props'
import { draco, getFileName } from '@/global/assetLoaders'
import { params } from '@/global/context'
import { assets, ecs, levelsData, time, ui } from '@/global/init'
import { loadLevelData } from '@/global/levelData'
import { updateRenderSize } from '@/global/rendering'
import { app } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import { NavGrid } from '@/lib/navGrid'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'
import { ToonMaterial } from '@/shaders/materials'
import { getdisplacementMap, HEIGHT, setDisplacement, spawnGroundAndTrees, spawnLevelData } from '@/states/game/spawnLevel'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from '@/states/game/spawnPlayer'
import { useQuery } from '@/ui/store'
import { getScreenBuffer } from '@/utils/buffer'
import { entries, getRandom } from '@/utils/mapFunctions'
import { throttle } from '@solid-primitives/scheduled'
import { delMany, get, set } from 'idb-keyval'
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PlaneGeometry, Quaternion, Raycaster, Vector2, Vector3 } from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { generateUUID } from 'three/src/math/MathUtils'
import { getGameRenderGroup } from './debugUi'
import { EntityEditor } from './EntityEditor'
import { MapEditor } from './MapEditor'
import { getModel, props } from './props'

export type ModelName = models | customModel | vegetation | gardenPlots | fruit_trees | village
export interface EntityData<T extends Record<string, any> | undefined> {
	model: ModelName
	scale: number
	position: [number, number, number]
	rotation: [number, number, number, number]
	map: string
	data: T
}

export type LevelData = Record<string, EntityData<any> | null>
export type CollidersData = Partial<Record<ModelName, {
	type: RigidBodyType
	size?: [number, number, number]
	sensor: boolean
	offset: [number, number, number]
	scale: number | null

} >>
export type LevelImage = NonNullable<{ [k in keyof Level]: Level[k] extends HTMLCanvasElement ? k : never }[keyof Level]>

export type RawLevel = { [k in keyof Level]: Level[k] extends HTMLCanvasElement ? string : Level[k] }

export const leveltypes = ['farm', 'crossroad', 'dungeon', 'ruins', 'intro', 'cellar', 'village'] as const
export type LevelType = (typeof leveltypes)[number]
export interface Level {
	path: HTMLCanvasElement
	trees: HTMLCanvasElement
	grass: HTMLCanvasElement
	heightMap: HTMLCanvasElement
	water: HTMLCanvasElement
	rock: HTMLCanvasElement
	id: string
	name: string
	type?: LevelType
	navgrid?: NavCell[][]
	size: { x: number, y: number }
	containCamera: boolean
}
const addedEntitiesQuery = ecs.with('entityId', 'model', 'group', 'position', 'rotation')
const mapQuery = useQuery(ecs.with('map'))
const cameraQuery = ecs.with('mainCamera', 'camera')
const groundQuery = ecs.with('ground', 'model')
const thumbnail = thumbnailRenderer(256)
const thumbnails: Record<string, HTMLCanvasElement> = {}
export const LevelEditor = () => {
	onMount(() => {
		for (const [key, model] of [...entries(assets.models), ...entries(assets.vegetation)]) {
			thumbnails[key] = thumbnail.getCanvas(model.scene, true, 1.8)
		}
	})
	const [disableSave, setDisableSave] = createSignal(false, { equals: false })
	const [open, setOpen] = createSignal(false)
	const map = createMemo(() => mapQuery()?.[0]?.map)
	const download = async () => {
		const data = await loadLevelData()
		// @ts-expect-error okok
		data.levels = await get('levels')
		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
		const a = document.createElement('a')
		a.download = 'data.json'
		a.href = URL.createObjectURL(blob)
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
	}

	const showUiListener = (e: KeyboardEvent) => {
		if (e.code === 'F2') {
			app.enable('debug')
			e.preventDefault()
			setOpen(!open())
		}
	}
	createEffect(() => {
		if (!open()) {
			app.disable('debug')
		}
	})
	onMount(() => {
		document.addEventListener('keydown', showUiListener)
	})
	onCleanup(() => {
		document.removeEventListener('keydown', showUiListener)
	})

	css/* css */`
	:global(.thumbnail canvas){
		width:50px;
	}`

	return (

		<div>
			<Show when={open() && map()}>
				{(map) => {
					const { scene, renderer } = getGameRenderGroup()
					const [selectedTab, setSelectedTab] = createSignal<'place props' | 'draw map'>('place props')
					const [random, setRandom] = createSignal(false)
					const [selectedProp, setSelectedProp] = createSignal<PlacableProp<any> | null>(null)
					const [selectedEntity, setSelectedEntity] = createSignal<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>(null)
					const [selectedModel, setSelectedModel] = createSignal<null | ModelName>(null)
					const [levelData, setLevelData] = createSignal<LevelData>(levelsData.levelData)
					const [colliderData, setColliderData] = createSignal<CollidersData>(levelsData.colliderData)
					// ! LEVELS
					const [activeLevelIndex, setActiveLevelIndex] = createSignal<number>(levelsData.levels.findIndex(x => x.id === map())!)
					const ctrl = atom(false)
					window.addEventListener('keydown', (e) => {
						if (e.code === 'ControlLeft') {
							ctrl(true)
						}
					})
					window.addEventListener('keyup', (e) => {
						if (e.code === 'ControlLeft') {
							ctrl(false)
						}
					})

					let fakeGround: null | Mesh<PlaneGeometry> = null
					const [levels, setLevels] = createSignal<Level[]>(levelsData.levels)
					const newLevel = () => {
						const id = generateUUID()
						setLevels(x => [...x, {
							path: getScreenBuffer(100, 100).canvas,
							trees: getScreenBuffer(100, 100).canvas,
							grass: getScreenBuffer(100, 100).canvas,
							heightMap: getScreenBuffer(100, 100).canvas,
							water: getScreenBuffer(100, 100).canvas,
							rock: getScreenBuffer(100, 100).canvas,
							size: { x: 100, y: 100 },
							name: `level n°${x.length + 1}`,
							id,
							containCamera: true,
						}])
						setActiveLevelIndex(levels().length - 1)
					}
					const resetLocalChanges = async () => {
						await delMany(['levels', 'levelData', 'colliderData'])
						window.location.reload()
					}
					const saveChanges = throttle(() => {
						if (!disableSave()) {
							const rawLevels: RawLevel[] = levels().map(level => ({
								...level,
								path: level.path.toDataURL(),
								trees: level.trees.toDataURL(),
								grass: level.grass.toDataURL(),
								heightMap: level.heightMap.toDataURL(),
								water: level.water.toDataURL(),
								rock: level.rock.toDataURL(),
							}))
							set('levels', rawLevels)
						}
					}, 2000)
					createEffect(() => {
						Object.assign(levelsData.levels, levels())
						saveChanges()
					})

					const updateLevel = (level: Level) => (newLevel: Partial<Level>) => {
						setLevels(x => x.map((l) => {
							if (l === level) {
								return { ...l, ...newLevel }
							}
							return l
						}))
					}
					let navgrid: null | NavGrid = null
					const navgridDisplayed = atom(false)
					const displayNavgrid = (level: Level) => {
						navgrid?.mesh?.removeFromParent()
						if (level.navgrid) {
							navgrid ??= new NavGrid(level.navgrid, level.size)
							navgrid?.render()
						}
					}
					const generateNavGrid = (level: Level) => {
						navgrid = NavGrid.fromLevel(level.size)
						navgrid.render()
						updateLevel(level)({ navgrid: navgrid.matrix })
					}

					const setFakeGround = (level: Level) => {
						if (fakeGround) {
							fakeGround.removeFromParent()
						}
						fakeGround = new Mesh(new PlaneGeometry(level.size.x, level.size.y, level.size.x, level.size.y), new MeshBasicMaterial({ opacity: 0, transparent: true }))
						fakeGround.rotation.setFromQuaternion(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2))
						fakeGround.position.y = -HEIGHT / 4
						setDisplacement(fakeGround.geometry, getdisplacementMap(level, true))
						scene.add(fakeGround)
					}
					const switchLevel = (level: Level) => {
						navgridDisplayed(false)
						if (navgrid) {
							navgrid.mesh?.removeFromParent()
							navgrid = null
						}

						setActiveLevelIndex(levels().indexOf(level))
						for (const ground of groundQuery) {
							ecs.remove(ground)
						}
						setFakeGround(level)
						app.disable('dungeon')
						app.disable('farm')
						ecs.add({ map: level.id })
						spawnGroundAndTrees(level)
						spawnLevelData()
						ecs.add({ ...playerBundle(PLAYER_DEFAULT_HEALTH, null), position: new Vector3(0, 10, 0) })
					}
					const draw = createMemo(() => selectedTab() === 'draw map')
					const uploadModel = () => {
						setDisableSave(true)
						const input = document.createElement('input')
						input.type = 'file'
						input.accept = '.glb'
						input.addEventListener('change', async (e) => {
							const file = (e.target as HTMLInputElement)?.files?.[0]
							const loader = new GLTFLoader().setDRACOLoader(draco)
							if (file) {
								const arrayBuffer = await file?.arrayBuffer()
								const name = getFileName(file.name) as models
								const glb = await loader.parseAsync(arrayBuffer, '')
								glb.scene.traverse((x) => {
									if (x instanceof Mesh && x.material instanceof MeshStandardMaterial) {
										x.material = new ToonMaterial({ color: x.material.color, map: x.material.map, transparent: true })
									}
								})
								assets.models[name] = glb
								setSelectedProp({
									name,
									models: [name],
								})
							}
						})
						input.click()
					}
					createEffect(() => {
						const prop = selectedProp()
						if (prop) {
							setSelectedModel(prop.models[0])
						} else {
							setSelectedModel(null)
						}
					})
					const activeLevel = createMemo(() => levels()[activeLevelIndex()])
					const deleteLevel = (levelIndex: number) => {
						// eslint-disable-next-line no-alert
						if (confirm('delete level?')) {
							setLevels(x => x.filter((_, i) => i !== levelIndex))
							Object.assign(levelsData.levels, levels())
							saveChanges()
							window.location.reload()
						}
					}
					onMount(async () => {
						const camera = cameraQuery.first?.camera
						if (!camera) return
						const val = window.innerWidth
						const ratio = window.innerHeight / window.innerWidth
						renderer.setSize(val, val * ratio)
						const group = camera.parent!
						camera.removeFromParent()
						if (camera instanceof OrthographicCamera) {
							camera.far = 1000000
							camera.near = 0.0000001
						}
						camera.position.set(...group.position.toArray())
						const controls = new MapControls(camera, renderer.domElement)
						createEffect(() => {
							controls.enabled = !draw() || ctrl()
						})
						controls.update(0)
						setFakeGround(activeLevel())
						ui.updateSync(() => {
							controls.update(time.delta / 100)
						})
						createEffect(() => {
							if (selectedEntity()) {
								controls.enabled = false
							} else {
								controls.enabled = true
							}
						})
						onCleanup(() => {
							group?.add(camera)
							camera.position.set(0, 0, 0)
							updateRenderSize()
							controls.dispose()
						})
					})
					createEffect(() => {
						Object.assign(levelsData.levelData, levelData())
						if (!disableSave()) {
							set('levelData', levelData())
						}
					})
					createEffect(() => {
						Object.assign(levelsData.colliderData, colliderData())
						if (!disableSave()) {
							set('colliderData', colliderData())
						}
					})
					const clickListener = (event: MouseEvent) => {
						const camera = cameraQuery.first?.camera
						if (!camera) return
						const selected = selectedProp()
						if (selected && random()) {
							setSelectedModel(getRandom(selected.models))
						}
						const propModel = selectedModel()
						const pointer = new Vector2()
						pointer.x = (event.clientX / window.innerWidth) * 2 - 1
						pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
						const raycaster = new Raycaster()
						raycaster.setFromCamera(pointer, camera)
						const intersects = raycaster.intersectObjects(scene.children)
						if (!draw()) {
							if (selected && propModel) {
								const position = intersects.find(x => x.object === fakeGround)?.point
								if (!position) return
								const scale = colliderData()[propModel]?.scale ?? 1
								const model = getModel(propModel)
								model.scale.setScalar(scale)
								const placed = ecs.add({
									model,
									position,
									entityId: generateUUID(),
									rotation: new Quaternion(),
									...inMap(),
								})
								setLevelData({
									...levelData(),
									[placed.entityId]: {
										model: propModel,
										scale,
										position: placed.position.toArray(),
										rotation: placed.rotation.toJSON(),
										map: map(),
										data: selected.data,
									},
								})
								if (!event.ctrlKey) {
									setSelectedEntity(null)
									setSelectedEntity(placed)
									setSelectedProp(null)
								}
							} else {
								let selected: Entity | null = null
								let distance = Number.POSITIVE_INFINITY
								for (const addedEntity of addedEntitiesQuery) {
									if (addedEntity === selectedEntity()) {
										return
									}
									addedEntity.model.traverse((x) => {
										const collision = intersects.find(int => int.object === x)
										if (collision && collision.distance < distance) {
											selected = addedEntity
											distance = collision.distance
										}
									})
								}
								if (selected) {
									setSelectedEntity(selected)
								}
							}
						}
					}
					const unSelect = (e: MouseEvent) => {
						e.preventDefault()
						setSelectedEntity(null)
						setSelectedProp(null)
					}
					onMount(() => {
						renderer.domElement.addEventListener('click', clickListener)
						renderer.domElement.addEventListener('contextmenu', unSelect)
						params.pixelation = false
					})
					onCleanup(() => {
						renderer.domElement.removeEventListener('click', clickListener)
						renderer.domElement.removeEventListener('contextmenu', unSelect)
						params.pixelation = true
						fakeGround && fakeGround.removeFromParent()
					})
					const update = (change: (level: Level) => void) => {
						setLevels(x => x.map((l, i) => {
							if (i === activeLevelIndex()) {
								change(l)
							}
							return l
						}))
					}
					const updateLevelSize = (change: (l: Level) => void) => {
						update(change)
						for (const canvasName of ['path', 'trees', 'grass', 'heightMap', 'water'] as LevelImage[]) {
							const buffer = getScreenBuffer(activeLevel().size.x, activeLevel().size.y, true)
							const canvas = activeLevel()[canvasName]
							buffer.drawImage(canvas, 0, 0, activeLevel().size.x, activeLevel().size.y)
							update(x => x[canvasName] = buffer.canvas)
						}
						switchLevel(activeLevel())
					}
					const changeLevel = (e: Event) => {
						const val = Number((e.target as HTMLInputElement).value)
						switchLevel(levels()[val])
					}

					return (
						<div style={{ 'z-index': 2, 'position': 'fixed' }}>
							<select onChange={changeLevel} value={activeLevelIndex()}>
								<For each={levels()}>
									{(level, index) => {
										return <option value={index()}>{level.name}</option>
									}}
								</For>
							</select>
							<div><button onClick={() => deleteLevel(activeLevelIndex())}>Delete level</button></div>
							<div><button onClick={newLevel}>New level</button></div>
							<div><button onClick={download}>Download</button></div>
							<div>
								<button onClick={resetLocalChanges}>Reset local changes</button>
							</div>
							<div>
								<Show when={activeLevel()}>
									{(level) => {
										return (
											<>
												<div>
													name
													<input
														type="text"
														value={level().name}
														onChange={(e) => {
															update(l => l.name = e.target.value) }}
													/>
												</div>
												<div>
													level type
													<select
														value={level().type}
														onChange={e => update(l => Object.assign(l, { type: e.target.value }))}
													>
														{leveltypes.map(type => <option selected={type === level().type} value={type}>{type}</option>)}

													</select>
												</div>
												<div>
													contain camera
													<input type="checkbox" checked={level().containCamera} onChange={e => updateLevelSize(x => x.containCamera = e.target.checked)}></input>
												</div>
												<div>
													width
													<input type="number" value={level().size.x} onChange={e => updateLevelSize(x => x.size.x = e.target.valueAsNumber)}></input>
												</div>
												<div>
													height
													<input type="number" value={level().size.y} onChange={e => updateLevelSize(x => x.size.y = e.target.valueAsNumber)}></input>
												</div>
												<div>
													<button onClick={() => generateNavGrid(level())}>
														Generate Navgrid
													</button>
												</div>
												<div>
													<button onClick={() => displayNavgrid(level())} disabled={!level().navgrid} classList={{ selected: navgridDisplayed() }}>
														Display nav grid
													</button>
												</div>
											</>
										)
									}}
								</Show>
							</div>
							<div style={{ 'position': 'fixed', 'top': 0, 'right': 0, 'display': 'grid', 'grid-template-columns': 'auto auto' }}>
								<div>
									<Show when={selectedEntity()}>
										{entity => (
											<EntityEditor
												map={map}
												entity={entity}
												levelData={levelData}
												setLevelData={setLevelData}
												setSelectedEntity={setSelectedEntity}
												colliderData={colliderData}
												setColliderData={setColliderData}
											/>
										)}
									</Show>
								</div>
								{/* //! Selected Model */}
								<Show when={selectedProp()}>
									{(data) => {
										const models = createMemo(() => data().models)
										return (
											<div style={{ position: 'fixed', bottom: 0, left: 0 }}>
												<For each={models()}>
													{(model) => {
														const thumbnail = thumbnails?.[model]
														return (
															<button
																classList={{ selected: model === selectedModel() }}
																onClick={() => setSelectedModel(model)}
															>
																<div class="thumbnail" style={{ 'display': 'grid', 'place-items': 'center' }}>
																	{model}
																	<Show when={thumbnail}>
																		{thumbnail}
																	</Show>
																</div>
															</button>
														)
													}}
												</For>
												<div style={{ 'display': 'inline-flex', 'place-items': 'center' }}>
													<input type="checkbox" checked={random()} onChange={e => setRandom(e.target.checked)}></input>
													random
												</div>
											</div>
										)
									}}
								</Show>
								<div>
									<div>
										<For each={['place props', 'draw map'] as const}>
											{tab => <button classList={{ selected: tab === selectedTab() }} onClick={() => setSelectedTab(tab)}>{tab}</button>}
										</For>
									</div>
									<Show when={selectedTab() === 'place props'}>
										<For each={props}>
											{(prop) => {
												const isSelected = createMemo(() => selectedProp() === prop)
												return (
													<div style={{ display: 'grid' }}>
														<button
															classList={{ selected: isSelected() }}
															onClick={() => setSelectedProp(isSelected() ? null : prop)}
														>
															{prop.name}
														</button>
													</div>
												)
											}}
										</For>
										<span>press ctrl to keep placing props</span>
										<div><button onClick={uploadModel}>preview model</button></div>
									</Show>
									<Show when={selectedTab() === 'draw map'}>
										<Show when={activeLevel()}>
											{active => <MapEditor activeLevel={active} updateLevel={updateLevel(active())} switchLevel={() => switchLevel(activeLevel())} fakeGround={fakeGround} />}
										</Show>
									</Show>
								</div>
							</div>
						</div>
					)
				}}
			</Show>
		</div>
	)
}