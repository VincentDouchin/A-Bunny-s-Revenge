import type { With } from 'miniplex'
import type { Accessor, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'

import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { set } from 'idb-keyval'
import { Box3, BoxGeometry, CanvasTexture, Euler, Mesh, MeshBasicMaterial, Object3D, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import type { CollidersData, LevelData } from './LevelEditor'
import { getGameRenderGroup } from './debugUi'
import type { ExtraData } from './props'
import { getModel } from './props'
import { entries } from '@/utils/mapFunctions'
import { ToonMaterial } from '@/shaders/materials'
import { getSize } from '@/lib/models'
import type { Direction } from '@/lib/directions'
import { cameraQuery } from '@/global/rendering'
import { ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

export const EntityEditor = ({ entity, levelData, setLevelData, setSelectedEntity, colliderData, setColliderData }: {
	entity: Accessor<NonNullable<With<Entity, 'entityId' | 'position' | 'rotation' | 'model'>>>
	levelData: Accessor<LevelData>
	setLevelData: Setter<LevelData>
	setSelectedEntity: Setter<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>
	setColliderData: Setter<CollidersData>
	colliderData: Accessor<CollidersData>
}) => {
	const entityData = createMemo(() => levelData()[entity().entityId])
	return (
		<Show when={entityData()}>
			{ (entityData) => {
				const modelCollider = createMemo(() => colliderData()[entityData().model])
				const updateEntity = (newEntity: Partial<LevelData[string]>) => {
					setLevelData({ ...levelData(), [entity().entityId]: { ...entityData(), ...newEntity } })
				}
				const [scale, setScale] = createSignal(entityData().scale)
				const [defaultScale, setDefaultScale] = createSignal(Boolean(colliderData()[entityData().model]?.scale))

				const updateScale = (newScale: number) => {
					setScale(newScale)
					if (defaultScale()) {
						setColliderData(x => ({
							...x,
							[entityData().model]: {
								...modelCollider(),
								scale: newScale,
							},
						}))
					} else {
						setColliderData(x => ({
							...x,
							[entityData().model]: {
								...modelCollider(),
								scale: null,
							},
						}))
					}
					updateEntity({ scale: scale() })
				}
				const camera = cameraQuery.first!.camera
				const { renderer, scene } = getGameRenderGroup()
				const transform = new TransformControls(camera, renderer.domElement)

				const dummy = new Object3D()
				scene.add(dummy)
				transform.attach(dummy)

				entity().group?.getWorldPosition(dummy.position)
				dummy.rotation.setFromQuaternion(entity().rotation)
				const [editingCollider, setEditingCollider] = createSignal(false)

				const transformListener = () => {
					entity().position.set(dummy.position.x, dummy.position.y, dummy.position.z)
					entity().rotation.setFromEuler(dummy.rotation)
					updateEntity({ position: entity().position.toArray(), rotation: entity().rotation.toJSON() })
				}

				transform.addEventListener('objectChange', transformListener)

				scene.add(transform)
				onCleanup(() => {
					transform.removeEventListener('objectChange', transformListener)
					dummy.removeFromParent()
					transform.detach()
				})

				createEffect(() => {
					ecs.removeComponent(entity(), 'model')
					const model = getModel(entityData().model)
					model.scale.setScalar(entityData().scale)
					const collider = colliderData()[entityData().model]
					ecs.removeComponent(entity(), 'body')
					ecs.removeComponent(entity(), 'bodyDesc')
					ecs.removeComponent(entity(), 'collider')
					ecs.removeComponent(entity(), 'colliderDesc')
					ecs.removeComponent(entity(), 'size')
					if (collider?.offset !== undefined) {
						const size = new Vector3()
						if (collider.size) {
							size.set(...collider.size)
							size.multiplyScalar(scale())
						} else {
							const boxSize = new Box3().setFromObject(model)
							boxSize.getSize(size)
						}
						ecs.update(entity(), {
							bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
							colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setSensor(collider.sensor).setTranslation(...new Vector3(...(collider.offset ?? [0, 0, 0])).multiplyScalar(scale()).toArray()),
							size,
						})
					}
					ecs.addComponent(entity(), 'model', model)
				})
				const entityRef = entity()
				const deleteSelected = () => {
					setSelectedEntity(null)
					ecs.remove(entityRef)
					if (entityRef.entityId in levelData()) {
						const newdata = { ...levelData(), [entityRef.entityId]: null }
						setLevelData(newdata)
						set('levelData', newdata)
					}
				}
				const deleteListener = (e: KeyboardEvent) => {
					if (e.code === 'Delete') {
						deleteSelected()
					}
				}
				onMount(() => document.body.addEventListener('keydown', deleteListener))
				onCleanup(() => document.body.removeEventListener('keydown', deleteListener))
				const colliderTransformListener = (box: Mesh) => () => {
					const size = new Vector3()
					const cloneBox = box.clone()
					cloneBox.rotation.set(0, 0, 0)
					new Box3().setFromObject(cloneBox).getSize(size)
					setColliderData({
						...colliderData(),
						[entityData().model]: {
							...modelCollider(),
							offset: box.position.clone().divideScalar(scale()).toArray(),
							size: size.divideScalar(scale()).toArray(),
							scale: scale(),
						},
					})
				}
				createEffect(() => {
					if (editingCollider()) {
						transform.detach()
					} else {
						transform.attach(dummy)
					}
				})
				const data = createMemo(() => entityData().data)
				const changeTexture = () => {
					const input = document.createElement('input')
					input.type = 'file'
					input.accept = '.png,.jpg,.jpeg'
					input.addEventListener('change', async (e) => {
						const target = e.target as HTMLInputElement
						const file = target.files?.[0]
						if (file) {
							const img = new Image()
							const reader = new FileReader()
							reader.onload = (e: ProgressEvent<FileReader>) => {
								if (e.target?.result) {
									img.src = e.target?.result as string
									const text = new CanvasTexture(img)
									text.colorSpace = SRGBColorSpace
									text.flipY = false
									const mat = new ToonMaterial({ map: text })
									entity().model.traverse((x) => {
										if (x instanceof Mesh) {
											x.material = mat
										}
									})
								}
							}
							reader.readAsDataURL(file)
						}
					})
					input.click()
				}
				return (
					<div>
						<Show when={data()}>
							{(data: Accessor<ExtraData[keyof ExtraData]>) => {
								return (
									<For each={entries(data())}>
										{([key, val]) => {
											const updateData = (newData: ExtraData[keyof ExtraData]) => updateEntity({ data: { ...data(), ...newData } })
											return (
												<div>
													{key === 'direction' && (
														<select
															value={val}
															onChange={e => updateData({ ...data(), direction: e.target.value as Direction })}
														>
															<option value="north">north</option>
															<option value="south">south</option>
															<option value="west">west</option>
															<option value="east">east</option>
														</select>
													)}
													{key === 'doorLevel' && (<input type="number" value={val} onChange={e => updateData({ ...data(), doorLevel: e.target.valueAsNumber })}></input>) }
													{key === 'text' && (
														<input
															type="text"
															value={val}
															placeholder="Sign text"
															onChange={(e) => {
																e.stopImmediatePropagation()
																updateData({ ...data(), text: e.target.value })
															}}
														>
														</input>
													)}
													{key === 'name' && (
														<input
															type="text"
															placeholder="marker name"
															value={val}
															onChange={(e) => {
																e.stopImmediatePropagation()
																updateData({ ...data(), name: e.target.value })
															}}
														/>
													)}
												</div>
											)
										}}
									</For>
								)
							}}
						</Show>
						PROP
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
							<input type="number" value={scale()} onChange={e => updateScale(e.target.valueAsNumber)} style={{ width: '50px' }}></input>
							<input type="checkbox" checked={defaultScale()} onChange={e => setDefaultScale(e.target.checked)}></input>
							default scale
						</div>
						<For each={['x', 'y', 'z'] as const}>
							{(axis, i) => (
								<div>
									position
									{' '}
									{axis}
									<input
										type="number"
										value={entityData().position[i()]}
										onChange={(e) => {
											dummy.position[axis] = e.target.valueAsNumber
											transformListener()
										}}
									>
									</input>
								</div>
							)}
						</For>
						<For each={['x', 'y', 'z'] as const}>
							{axis => (
								<div>
									rotation
									{' '}
									{axis}
									<input
										type="number"
										value={Math.round(new Euler().setFromQuaternion(new Quaternion().set(...entityData().rotation))[axis] * 180 / Math.PI)}
										onChange={(e) => {
											dummy.rotation[axis] = e.target.valueAsNumber * Math.PI / 180
											transformListener()
										}}
									>
									</input>
								</div>
							)}
						</For>
						<div>
							collider
							<input
								type="checkbox"
								checked={Boolean(modelCollider()?.offset)}
								onChange={() => {
									if (modelCollider()) {
										setColliderData(x => ({ ...x, [entityData().model]: null }))
									} else {
										setColliderData(x => ({
											...x,
											[entityData().model]: {
												type: RigidBodyType.Fixed,
												sensor: false,
												offset: [0, 0, 0],
											},
										}))
									}
								}}
							>
							</input>
						</div>
						<div><button onClick={changeTexture}>test texture</button></div>
						<div>
							edit collider
							<input
								type="checkbox"
								checked={editingCollider()}
								onChange={e => setEditingCollider(e.target.checked)}
							>
							</input>

						</div>

						<Show when={editingCollider() && entity() && entityData()}>
							{(_) => {
								const colliderTransform = new TransformControls(camera, renderer.domElement)
								onMount(() => {
									const size = entity()?.size ?? getSize(entity().model)
									const box = new Mesh(
										new BoxGeometry(size.x, size.y, size.z),
										new MeshBasicMaterial({ color: `red`, opacity: 0.5, transparent: true }),
									)

									box.position.copy(new Vector3(...modelCollider()!.offset).multiplyScalar(scale()))
									scene.add(colliderTransform)
									entity().group!.add(box)
									colliderTransform.attach(box)
									const listener = colliderTransformListener(box)
									colliderTransform.addEventListener('objectChange', listener)
									onCleanup(() => {
										box.removeFromParent()
										colliderTransform.removeEventListener('objectChange', listener)
										colliderTransform.detach()
									})
								})
								return (
									<div>
										COLLIDER
										<For each={['translate', 'scale'] as const}>
											{mode => (
												<button onClick={() => colliderTransform.mode = mode}>
													{mode}
												</button>
											)}
										</For>
										<div>
											collider type
											<select onChange={e => setColliderData(x => ({
												...x,
												[entityData().model]: {
													...modelCollider(),
													type: Number(e.target.value),
												},
											}))}
											>
												<option value={RigidBodyType.Fixed}>Fixed</option>
												<option value={RigidBodyType.Dynamic}>Dynamic</option>
											</select>
										</div>
										<div>
											sensor
											<input
												type="checkbox"
												checked={modelCollider()?.sensor}
												onChange={e => setColliderData(x => ({
													...x,
													[entityData().model]: {
														...modelCollider(),
														sensor: e.target.checked,
													},
												}))}
											>

											</input>
										</div>
									</div>

								)
							}}
						</Show>
					</div>
				)
			}}
		</Show>
	)
}