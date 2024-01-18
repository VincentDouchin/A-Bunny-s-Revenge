import type { models } from '@assets/assets'
import { get, set } from 'idb-keyval'
import type { With } from 'miniplex'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Object3D, Quaternion, Raycaster, Vector2 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { generateUUID } from 'three/src/math/MathUtils'
import { type PlacableProp, props } from './props'
import { composer, renderer, scene } from '@/global/rendering'
import { assets, ecs, ui } from '@/global/init'
import type { Entity } from '@/global/entity'
import { params } from '@/global/context'
import { camera } from '@/global/camera'

export type LevelData = Record<string, {
	model: models
	scale: number
	position: [number, number, number]
	rotation: [number, number, number, number]
	map: string
}>
const addedEntitiesQuery = ecs.with('entityId', 'model', 'group', 'position', 'rotation')
const mapQuery = ecs.with('map')
const cameraQuery = ecs.with('mainCamera', 'camera')
export const LevelEditor = () => {
	const [open, setOpen] = createSignal(false)
	const map = ui.sync(() => mapQuery.first?.map)
	return (
		<div>
			<button onClick={() => setOpen(!open())}>Level editor</button>
			<Show when={open() && map()}>
				{(map) => {
					const [selectedProp, setSelectedProp] = createSignal<PlacableProp | null>(null)
					const [selectedEntity, setSelectedEntity] = createSignal<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>(null)
					onMount(() => {
						const val = window.innerWidth
						const ratio = window.innerHeight / window.innerWidth
						renderer.setSize(val, val * ratio)
						composer.setSize(val, val * ratio)
						const group = camera.parent!
						camera.removeFromParent()
						camera.position.set(...group.position.toArray())
						const controls = new OrbitControls(camera, renderer.domElement)
						ui.updateSync(() => {
							controls.update()
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
							const val = params.renderWidth
							const ratio = window.innerHeight / window.innerWidth
							renderer.setSize(val, val * ratio)
							composer.setSize(val, val * ratio)
							camera.zoom = window.innerWidth / window.innerHeight / params.zoom
						})
					})

					const [levelData, setLevelData] = createSignal<LevelData>({})
					onMount(async () => {
						setLevelData(await get('levelData') ?? {})
					})
					const clickListener = (event: MouseEvent) => {
						const camera = cameraQuery.first?.camera
						if (!camera) return
						const selected = selectedProp()
						const pointer = new Vector2()
						pointer.x = (event.clientX / window.innerWidth) * 2 - 1
						pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
						const raycaster = new Raycaster()
						raycaster.setFromCamera(pointer, camera)

						const intersects = raycaster.intersectObjects(scene.children)
						if (selected) {
							const placed = ecs.add({
								model: assets.models[selected.models[0]].scene.clone(),
								position: intersects[0].point,
								entityId: generateUUID(),
								rotation: new Quaternion(),
								inMap: true,
							})
							levelData()[placed.entityId] = {
								model: selected.models[0],
								scale: 1,
								position: placed.position.toArray(),
								rotation: placed.rotation.toJSON(),
								map: map(),
							}
							set('levelData', levelData())
							setSelectedEntity(placed)
							setSelectedProp(null)
						} else {
							for (const addedEntity of addedEntitiesQuery) {
								addedEntity.model.traverse((x) => {
									if (intersects.some(int => int.object === x)) {
										setSelectedEntity(addedEntity)
									}
								})
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
					})
					onCleanup(() => {
						renderer.domElement.removeEventListener('click', clickListener)
						renderer.domElement.removeEventListener('contextmenu', unSelect)
					})

					return (
						<div style={{ 'position': 'fixed', 'top': 0, 'right': 0, 'display': 'grid', 'grid-template-columns': 'auto auto' }}>
							<div>
								<Show when={selectedEntity()}>
									{(entity) => {
										const entityData = createMemo(() => levelData()[entity().entityId])

										const updateEntity = (newEntity: Partial<LevelData[string]>) => {
											setLevelData({ ...levelData(), [entity().entityId]: { ...entityData(), ...newEntity } })
											set('levelData', levelData())
										}
										const camera = cameraQuery.first!.camera
										const transform = new TransformControls(camera, renderer.domElement)
										const dummy = new Object3D()
										scene.add(dummy)
										transform.attach(dummy)
										scene.add(dummy)
										entity().group?.getWorldPosition(dummy.position)
										dummy.rotation.setFromQuaternion(entity().rotation)
										const transformListener = () => {
											entity().position.set(dummy.position.x, dummy.position.y, dummy.position.z)
											entity().rotation.set(...new Quaternion().setFromEuler(dummy.rotation).toJSON())
											updateEntity({ position: entity().position.toArray(), rotation: entity().rotation.toJSON() })
										}
										transform.addEventListener('change', transformListener)

										scene.add(transform)
										onCleanup(() => {
											dummy.removeFromParent()
											transform.removeFromParent()
											transform.dispose()
											transform.removeEventListener('change', transformListener)
										})

										createEffect(() => {
											ecs.removeComponent(entity(), 'model')
											const model = assets.models[entityData().model].scene.clone()
											model.scale.setScalar(entityData().scale)
											ecs.addComponent(entity(), 'model', model)
										}, entityData())

										const deleteSelected = () => {
											ecs.remove(entity())
											delete levelData()[entity().entityId]
											set('levelData', levelData())
											setSelectedEntity(null)
										}
										return (
											<div>
												<For each={['translate', 'rotate'] as const}>
													{mode => (
														<button onClick={() => transform.mode = mode}>
															{mode}
														</button>
													)}
												</For>
												<div>{entity().entityId}</div>
												<button onClick={deleteSelected}>Delete entity</button>
												<div>
													scale
													<input type="number" value={entityData().scale} onChange={e => updateEntity({ scale: e.target.valueAsNumber })}></input>
												</div>
												<Show when={entityData()}>
													{(data) => {
														const models = createMemo(() => props.find(x => x.models.includes(data().model))!.models)
														return (
															<div style={{ position: 'fixed', bottom: 0, left: 0 }}>
																<For each={models()}>
																	{(model) => {
																		return (
																			<button onClick={() => updateEntity({ model })}>
																				{model}
																			</button>
																		)
																	}}
																</For>
															</div>
														)
													}}
												</Show>
											</div>
										)
									}}
								</Show>
							</div>
							<div>
								<For each={props}>
									{(prop) => {
										const isSelected = createMemo(() => selectedProp() === prop)
										return (
											<div style={{ display: 'grid' }}>
												<button
													style={isSelected() ? { background: 'black', color: 'white' } : {}}
													onClick={() => setSelectedProp(isSelected() ? null : prop)}
												>
													{prop.name}
												</button>
											</div>
										)
									}}
								</For>
							</div>

						</div>
					)
				}}
			</Show>
		</div>
	)
}