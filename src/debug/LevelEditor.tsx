import type { models } from '@assets/assets'
import type { RigidBodyType } from '@dimforge/rapier3d-compat'
import { set } from 'idb-keyval'
import type { With } from 'miniplex'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Mesh, MeshStandardMaterial, Quaternion, Raycaster, Vector2 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { generateUUID } from 'three/src/math/MathUtils'
import { EntityEditor } from './EntityEditor'
import type { PlacableProp, customModel } from './props'
import { getModel, props } from './props'

import type { Level } from '@/LDTKMap'
import { getFileName } from '@/global/assetLoaders'
import { loadLevelData } from '@/global/assets'
import { camera } from '@/global/camera'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { assets, ecs, levelsData, ui } from '@/global/init'
import { renderer, scene } from '@/global/rendering'
import { campState, dungeonState } from '@/global/states'
import { ToonMaterial } from '@/shaders/GroundShader'
import { spawnCharacter } from '@/states/game/spawnCharacter'
import { spawnGroundAndTrees, spawnLevelData } from '@/states/game/spawnLevel'
import { spawnLight } from '@/states/game/spawnLights'
import { getRandom } from '@/utils/mapFunctions'

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

const addedEntitiesQuery = ecs.with('entityId', 'model', 'group', 'position', 'rotation')
const mapQuery = ecs.with('map')
const cameraQuery = ecs.with('mainCamera', 'camera')
export const LevelEditor = () => {
	const [disableSave, setDisableSave] = createSignal(false)
	const [open, setOpen] = createSignal(false)
	const map = ui.sync(() => mapQuery.first?.map)
	const download = async () => {
		const data = await loadLevelData()
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
					const [random, setRandom] = createSignal(false)
					const [selectedProp, setSelectedProp] = createSignal<PlacableProp<any> | null>(null)
					const [selectedEntity, setSelectedEntity] = createSignal<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>(null)
					const [selectedModel, setSelectedModel] = createSignal<null | models | customModel>(null)
					const [levelData, setLevelData] = createSignal<LevelData>({})
					const [colliderData, setColliderData] = createSignal<CollidersData>({})
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
						const val = window.innerWidth
						const ratio = window.innerHeight / window.innerWidth
						renderer.setSize(val, val * ratio)
						const group = camera.parent!
						camera.removeFromParent()
						camera.position.set(...group.position.toArray())
						const controls = new OrbitControls(camera, renderer.domElement)
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
							group?.add(camera)
							const val = params.renderWidth
							const ratio = window.innerHeight / window.innerWidth
							camera.position.set(0, 0, 0)
							renderer.setSize(val, val * ratio)
							controls.dispose()
						})
						const data = await loadLevelData()
						setLevelData(data.levelData)
						setColliderData(data.colliderData)
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
						if (selected && propModel) {
							const position = intersects.find(x => x.point.y === 0.5)?.point
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
								setSelectedEntity(placed)
								setSelectedProp(null)
							}
						} else {
							let hasSelected = false
							for (const addedEntity of addedEntitiesQuery) {
								if (!hasSelected) {
									addedEntity.model.traverse((x) => {
										if (intersects.some(int => int.object === x)) {
											setSelectedEntity(addedEntity)
											hasSelected = true
										}
									})
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
					const switchLevel = (level: Level) => {
						dungeonState.disable()
						campState.disable()
						const ground = level.layerInstances?.find(layer => layer.__identifier === 'ground')
						if (ground) {
							ecs.add({ map: level.iid })
							spawnGroundAndTrees(ground)
							spawnLight()
							spawnCharacter({})
							spawnLevelData({})
						}
					}
					return (
						<div style={{ 'z-index': 2, 'position': 'fixed' }}>
							<div style={{ display: 'grid' }}>
								<For each={assets.levels.levels}>
									{(level) => {
										return (
											<button

												onClick={() => switchLevel(level)}
											>
												{level.identifier}
											</button>
										)
									}}
								</For>
							</div>
							<button onClick={download}>Download</button>

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
								</div>

							</div>
						</div>
					)
				}}
			</Show>
		</div>
	)
}