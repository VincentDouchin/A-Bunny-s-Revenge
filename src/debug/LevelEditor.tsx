import type { models } from '@assets/assets'
import type { RigidBodyType } from '@dimforge/rapier3d-compat'
import { delMany, get, set } from 'idb-keyval'
import type { With } from 'miniplex'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import type { Vec2 } from 'three'
import { Mesh, MeshStandardMaterial, Quaternion, Raycaster, Vector2, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { generateUUID } from 'three/src/math/MathUtils'
import { EntityEditor } from './EntityEditor'
import type { PlacableProp, customModel } from './props'
import { getModel, props } from './props'

import { MapEditor } from './MapEditor'
import { debugState } from './debugState'
import { getFileName } from '@/global/assetLoaders'
import { camera } from '@/global/camera'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { assets, ecs, levelsData, ui } from '@/global/init'
import { renderer, scene } from '@/global/rendering'
import { campState, dungeonState } from '@/global/states'
import { ToonMaterial } from '@/shaders/GroundShader'
import { playerBundle } from '@/states/game/spawnPlayer'
import { spawnGroundAndTrees, spawnLevelData } from '@/states/game/spawnLevel'
import { getScreenBuffer } from '@/utils/buffer'
import { getRandom } from '@/utils/mapFunctions'
import { throttle } from '@/lib/state'
import { loadLevelData } from '@/global/levelData'

export interface EntityData<T extends Record<string, any>> {
	model: models | customModel
	scale: number
	position: [number, number, number]
	rotation: [number, number, number, number]
	map: string
	data: T
}

export type LevelData = Record<string, EntityData<any> | null>
export type CollidersData = Partial<Record<models | customModel, {
	type: RigidBodyType
	size?: [number, number, number]
	sensor: boolean
	offset: [number, number, number]
	scale: number | null
} >>
export type LevelImage = { [k in keyof Level]: Level[k] extends HTMLCanvasElement ? k : never }[keyof Level]

export type RawLevel = { [k in keyof Level]: Level[k] extends HTMLCanvasElement ? string : Level[k] }

export interface Level {
	path: HTMLCanvasElement
	trees: HTMLCanvasElement
	grass: HTMLCanvasElement
	heightMap: HTMLCanvasElement
	water: HTMLCanvasElement
	farm: boolean
	dungeon: boolean
	id: string
	name: string
	size: { x: number, y: number }
}
const addedEntitiesQuery = ecs.with('entityId', 'model', 'group', 'position', 'rotation')
const mapQuery = ecs.with('map')
const cameraQuery = ecs.with('mainCamera', 'camera')
const groundQuery = ecs.with('ground', 'model')
export const LevelEditor = () => {
	const [disableSave, setDisableSave] = createSignal(false, { equals: false })
	const [open, setOpen] = createSignal(false)
	const map = ui.sync(() => mapQuery.first?.map)
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
			e.preventDefault()
			setOpen(!open())
		}
	}
	onMount(() => {
		document.addEventListener('keydown', showUiListener)
	})
	onCleanup(() => {
		document.removeEventListener('keydown', showUiListener)
	})

	return (
		<div>
			<Show when={open() && map()}>
				{(map) => {
					const [selectedTab, setSelectedTab] = createSignal<'place props' | 'draw map'>('place props')
					const [random, setRandom] = createSignal(false)
					const [selectedProp, setSelectedProp] = createSignal<PlacableProp<any> | null>(null)
					const [selectedEntity, setSelectedEntity] = createSignal<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>(null)
					const [selectedModel, setSelectedModel] = createSignal<null | models | customModel>(null)
					const [levelData, setLevelData] = createSignal<LevelData>(levelsData.levelData)
					const [colliderData, setColliderData] = createSignal<CollidersData>(levelsData.colliderData)
					// ! LEVELS
					const [activeLevel, setActiveLevel] = createSignal<Level>(levelsData.levels.find(x => x.id === map())!)
					const [levels, setLevels] = createSignal<Level[]>(levelsData.levels)
					const newLevel = () => {
						const id = generateUUID()
						setLevels(x => [...x, {
							path: getScreenBuffer(100, 100).canvas,
							trees: getScreenBuffer(100, 100).canvas,
							grass: getScreenBuffer(100, 100).canvas,
							heightMap: getScreenBuffer(100, 100).canvas,
							water: getScreenBuffer(100, 100).canvas,
							size: { x: 100, y: 100 },
							farm: false,
							dungeon: false,
							name: `level n°${x.length + 1}`,
							id,
						}])
						setActiveLevel(levels().at(-1)!)
					}
					const resetLocalChanges = async () => {
						await delMany(['levels', 'levelData', 'colliderData'])
						window.location.reload()
					}
					const saveChanges = throttle(2000, () => {
						if (!disableSave()) {
							const rawLevels: RawLevel[] = levels().map(level => ({
								...level,
								path: level.path.toDataURL(),
								trees: level.trees.toDataURL(),
								grass: level.grass.toDataURL(),
								heightMap: level.heightMap.toDataURL(),
								water: level.water.toDataURL(),
							}))
							set('levels', rawLevels)
						}
					})
					createEffect(() => {
						Object.assign(levelsData.levels, levels())
						saveChanges({})
					})
					const deleteLevel = (level: Level) => {
						// eslint-disable-next-line no-alert
						if (confirm('delete level?')) {
							setLevels(x => x.filter(y => y !== level))
						}
					}
					const updateLevel = (level: Level) => (newLevel: Partial<Level>) => {
						Object.assign(level, newLevel)
						setActiveLevel(level)
						setLevels(x => x.map(l => l === level ? { ...l, ...newLevel } : l))
					}
					const switchLevel = (level: Level) => {
						setActiveLevel(level)
						dungeonState.disable()
						campState.disable()

						ecs.add({ map: level.id })
						spawnGroundAndTrees(level)
						spawnLevelData({})
						ecs.add({ ...playerBundle(), position: new Vector3() })
					}
					const updateLevelSize = (size: Vec2) => {
						const newLevel: Level = activeLevel()
						newLevel.size = size
						for (const canvas of ['path', 'trees', 'grass', 'heightMap', 'water'] as LevelImage[]) {
							const buffer = getScreenBuffer(size.x, size.y, true)
							buffer.drawImage(activeLevel()[canvas], 0, 0, size.x, size.y)
							newLevel[canvas] = buffer.canvas
						}
						updateLevel(activeLevel())(newLevel)
						switchLevel(newLevel)
					}
					const draw = createMemo(() => selectedTab() === 'draw map')

					const uploadModel = () => {
						setDisableSave(true)
						const input = document.createElement('input')
						input.type = 'file'
						input.accept = '.glb'
						input.addEventListener('change', async (e) => {
							const file = (e.target as HTMLInputElement)?.files?.[0]
							const loader = new GLTFLoader()
							if (file) {
								const arrayBuffer = await file?.arrayBuffer()
								const name = getFileName(file.name) as models
								const glb = await loader.parseAsync(arrayBuffer, '')
								glb.scene.traverse((x) => {
									if (x instanceof Mesh && x.material instanceof MeshStandardMaterial) {
										x.material = new ToonMaterial({ color: x.material.color, map: x.material.map })
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
					onMount(async () => {
						debugState.enable()
						const val = window.innerWidth
						const ratio = window.innerHeight / window.innerWidth
						renderer.setSize(val, val * ratio)
						const group = camera.parent!
						camera.removeFromParent()
						camera.position.set(...group.position.toArray())
						const controls = new OrbitControls(camera, renderer.domElement)
						createEffect(() => {
							controls.enabled = !draw()
						})
						controls.update()

						ui.updateSync(() => controls.update())
						createEffect(() => {
							if (selectedEntity()) {
								controls.enabled = false
							} else {
								controls.enabled = true
							}
						})
						onCleanup(() => {
							debugState.disable()
							group?.add(camera)
							const val = params.renderWidth
							const ratio = window.innerHeight / window.innerWidth
							camera.position.set(0, 0, 0)
							renderer.setSize(val, val * ratio)
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
								const position = intersects.find(x => x.object === groundQuery.first?.model)?.point
								if (!position) return
								const scale = colliderData()[propModel]?.scale ?? 1
								const model = getModel(propModel)
								model.scale.setScalar(scale)
								const placed = ecs.add({
									model,
									position,
									entityId: generateUUID(),
									rotation: new Quaternion(),
									inMap: true,
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
					})
					const update = createMemo(() => updateLevel(activeLevel()))

					return (
						<div style={{ 'z-index': 2, 'position': 'fixed' }}>
							<div style={{ display: 'grid' }}>
								<For each={levels()}>
									{(level) => {
										return (
											<div>
												<button
													onClick={() => switchLevel(level)}
												>
													{level.name}
												</button>
												<button onClick={() => deleteLevel(level)}>X</button>
											</div>
										)
									}}
								</For>
							</div>
							<div><button onClick={newLevel}>New level</button></div>
							<div><button onClick={download}>Download</button></div>
							<div>
								<button onClick={resetLocalChanges}>Reset local changes</button>
							</div>

							<div>
								<input type="text" value={activeLevel().name} onChange={e => update()({ name: e.target.value })} />
								<div>
									farm
									<input type="checkbox" checked={activeLevel().farm} onChange={e => update()({ farm: e.target.checked })}></input>
								</div>
								<div>
									dungeon
									<input type="checkbox" checked={activeLevel().dungeon} onChange={e => update()({ dungeon: e.target.checked })}></input>
								</div>
								<div>
									width
									<input type="number" value={activeLevel().size.x} onChange={e => updateLevelSize({ ...activeLevel().size, x: e.target.valueAsNumber })}></input>
								</div>
								<div>
									height
									<input type="number" value={activeLevel().size.y} onChange={e => updateLevelSize({ ...activeLevel().size, y: e.target.valueAsNumber })}></input>
								</div>

							</div>

							<div style={{ 'position': 'fixed', 'top': 0, 'right': 0, 'display': 'grid', 'grid-template-columns': 'auto auto' }}>
								<div>
									<Show when={selectedEntity()}>
										{entity => (
											<EntityEditor
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
														return (
															<button
																classList={{ selected: model === selectedModel() }}
																onClick={() => setSelectedModel(model)}
															>
																{model}
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
											{active => <MapEditor activeLevel={active} updateLevel={updateLevel(active())} />}
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