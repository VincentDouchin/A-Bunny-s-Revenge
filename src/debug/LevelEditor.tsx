import type { models } from '@assets/assets'
import type { RigidBodyType } from '@dimforge/rapier3d-compat'
import { set } from 'idb-keyval'
import type { With } from 'miniplex'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Quaternion, Raycaster, Vector2 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { generateUUID } from 'three/src/math/MathUtils'
import { EntityEditor } from './EntityEditor'
import { type PlacableProp, props } from './props'
import { composer, renderer, scene } from '@/global/rendering'
import { assets, ecs, levelsData, ui } from '@/global/init'
import type { Entity } from '@/global/entity'
import { params } from '@/global/context'
import { camera } from '@/global/camera'
import { loadLevelData } from '@/global/assets'

export type LevelData = Record<string, {
	model: models
	scale: number
	position: [number, number, number]
	rotation: [number, number, number, number]
	map: string
}>
export type CollidersData = Partial<Record<models, {
	type: RigidBodyType
	size?: [number, number, number]
	sensor: boolean
	offset: [number, number, number]
} >>

const addedEntitiesQuery = ecs.with('entityId', 'model', 'group', 'position', 'rotation')
const mapQuery = ecs.with('map')
const cameraQuery = ecs.with('mainCamera', 'camera')
export const LevelEditor = () => {
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
	return (
		<div>
			<button onClick={() => setOpen(!open())}>Level editor</button>
			<button onClick={download}>Download</button>
			<Show when={open() && map()}>
				{(map) => {
					const [selectedProp, setSelectedProp] = createSignal<PlacableProp | null>(null)
					const [selectedEntity, setSelectedEntity] = createSignal<With<Entity, 'entityId' | 'model' | 'position' | 'rotation'> | null>(null)

					const [levelData, setLevelData] = createSignal<LevelData>({})
					const [colliderData, setColliderData] = createSignal<CollidersData>({})
					onMount(async () => {
						const val = window.innerWidth
						const ratio = window.innerHeight / window.innerWidth
						renderer.setSize(val, val * ratio)
						composer.setSize(val, val * ratio)
						const group = camera.parent!
						const proj = camera.projectionMatrix.clone().toArray()
						camera.removeFromParent()
						camera.position.set(...group.position.toArray())
						const controls = new OrbitControls(camera, renderer.domElement)
						controls.update()
						camera.projectionMatrix.set(...proj)
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
							renderer.setSize(val, val * ratio)
							composer.setSize(val, val * ratio)
							controls.dispose()
						})
						const data = await loadLevelData()
						setLevelData(data.levelData)
						setColliderData(data.colliderData)
					})
					createEffect(() => {
						Object.assign(levelsData.levelData, levelData())
						set('levelData', levelData())
					})
					createEffect(() => {
						Object.assign(levelsData.colliderData, colliderData())
						set('colliderData', colliderData())
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
							setLevelData({
								...levelData(),
								[placed.entityId]: {
									model: selected.models[0],
									scale: 1,
									position: placed.position.toArray(),
									rotation: placed.rotation.toJSON(),
									map: map(),
								},
							})
							setSelectedEntity(placed)
							setSelectedProp(null)
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
					})
					onCleanup(() => {
						renderer.domElement.removeEventListener('click', clickListener)
						renderer.domElement.removeEventListener('contextmenu', unSelect)
					})

					return (
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