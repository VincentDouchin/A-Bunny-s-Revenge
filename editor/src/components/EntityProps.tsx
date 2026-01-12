import type { World } from '@dimforge/rapier3d-compat'
import type { Accessor } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import type { Mesh, Object3D } from 'three'
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import type { AssetData } from '../types'
import type { RapierDebugRenderer } from '@/lib/debugRenderer'

import { Ball, Capsule, ColliderDesc, Cuboid, Cylinder, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { faA } from '@fortawesome/free-solid-svg-icons'
import { trackDeep } from '@solid-primitives/deep'
import Fa from 'solid-fa'
import { createEffect, createMemo, For, on, onCleanup, onMount, Show, untrack } from 'solid-js'
import { createMutable, unwrap } from 'solid-js/store'
import { css } from 'solid-styled'

import atom from 'solid-use/atom'
import { Box3, Vector3 } from 'three'
import { entries } from '../../../src/utils/mapFunctions'
import { Tags } from './Tags'

type Shape = 'cuboid' | 'ball' | 'capsule' | 'cylinder'

export function EntityProps({ world, model, selectedCategory, selectedAsset, addTransformControls, boundingBox, entities, transformControlsMode, debugRenderer, tagsList, saveTagsList }: {
	world: World
	model: Accessor<Object3D | null>
	selectedCategory: Accessor<string | null>
	selectedAsset: Accessor<string | null>
	addTransformControls: () => [Mesh, TransformControls]
	boundingBox: Record<string, Record<string, AssetData>>
	entities: Record<string, Record<string, Object3D>>
	transformControlsMode: Atom<'translate' | 'scale' | 'rotate'>
	debugRenderer: RapierDebugRenderer
	tagsList: Atom<string[]>
	saveTagsList: (tags: string[]) => void
}) {
	const colliderShapes: Record<string, Shape | undefined> = {
		None: undefined,
		Box: 'cuboid',
		Sphere: 'ball',
		Capsule: 'capsule',
		Cylinder: 'cylinder',
	}
	const body = world.createRigidBody(RigidBodyDesc.fixed())
	const collider = world.createCollider(ColliderDesc.ball(1), body)
	let dummy: Mesh | null = null
	let transformControls: TransformControls | null = null

	const size = createMutable({ x: 1, y: 1, z: 1 })
	const position = createMutable({ x: 0, y: 0, z: 0 })
	const selectedShape = atom<Shape | 'link' | undefined>(undefined)
	const linkedCategory = atom<string | null>(null)
	const linkedModel = atom<string | null>(null)
	const tags = atom<string[]>([])

	const sizeOffet = createMemo(() => {
		switch (selectedShape()) {
			case 'ball' :return size.x / 2
			case 'cuboid' : return size.y / 2
			case 'capsule' : return size.y / 2 + size.x / 2
			case 'cylinder' : return size.y / 2
		}
		return null
	})
	const updateDummy = () => {
		if (dummy) {
			if (transformControlsMode() === 'scale') {
				size.x = Math.abs(dummy.scale.x)
				size.y = Math.abs(dummy.scale.y)
				size.z = Math.abs(dummy.scale.z)
			}
			if (transformControlsMode() === 'translate') {
				position.x = dummy.position.x
				position.y = dummy.position.y
				position.z = dummy.position.z
			}
		}
	}

	createEffect(() => {
		const y = sizeOffet()
		if (y !== null) {
			transformControls?.removeEventListener('change', updateDummy)
			dummy?.position.setY(y)
			body.setTranslation({ x: 0, y, z: 0 }, true)
			transformControls?.addEventListener('change', updateDummy)
		}
	})

	const colliderShape = createMemo(() => {
		switch (selectedShape()) {
			case 'cuboid': return new Cuboid(size.x / 2, size.y / 2, size.z / 2)
			case 'ball': return new Ball(size.x / 2)
			case 'capsule':return new Capsule(size.y / 2, size.x / 2)
			case 'cylinder':return new Cylinder(size.y / 2, size.x / 2)
		}
		return null
	})

	let loading = true
	const setExistingBoundingBox = () => {
		const b = untrack(() => boundingBox)
		loading = true
		selectedShape(undefined)

		transformControls?.detach()
		transformControls?.removeFromParent()
		transformControls?.removeEventListener('change', updateDummy)
		dummy?.removeFromParent()

		const category = selectedCategory()
		const asset = selectedAsset()
		position.x = 0
		position.y = 0
		position.z = 0
		size.x = 1
		size.y = 1
		size.z = 1
		if (category && asset) {
			const entity = b?.[category]?.[asset]
			const box = entity?.collider
			tags(entity?.tags ? entity.tags : [])
			if (box && box.type !== 'link') {
				selectedShape(box.type)
				size.x = box.size.x
				size.y = box.size.y ?? box.size.x
				size.z = box.size.z ?? box.size.x
				position.x = box.position.x
				position.y = box.position.y
				position.z = box.position.z
			} else if (box?.type === 'link') {
				selectedShape(box.type)
				linkedCategory(box.category)
				linkedModel(box.model)
			} else {
				size.x = 1
				size.y = 1
				size.z = 1
				linkedModel(null)
				linkedCategory(null)
			}
		}
		const [dummyMesh, controls] = addTransformControls()
		dummyMesh.scale.copy(size)
		dummyMesh.position.copy(position)
		controls.setMode('scale')
		dummy = dummyMesh
		transformControls = controls
		transformControls.addEventListener('change', updateDummy)
		loading = false
		createEffect(() => {
			const visible = Boolean(selectedShape())
			if (transformControls) {
				transformControls.visible = visible
			}
			debugRenderer.visible = visible
		})
		createEffect(() => {
			if (transformControls) {
				transformControls.setMode(transformControlsMode())
			}
		})
	}
	onMount(setExistingBoundingBox)
	createEffect(on(model, setExistingBoundingBox))

	const setAutoSize = () => {
		const m = model()
		if (m && collider) {
			const box = new Box3().setFromObject(m)
			const sizeTemp = new Vector3()
			box.getSize(sizeTemp)
			if (selectedShape() === 'capsule') {
				sizeTemp.x /= 2
				sizeTemp.y /= 2
			}
			size.x = sizeTemp.x
			size.y = sizeTemp.y
			size.z = sizeTemp.z
			dummy?.scale.copy(sizeTemp)
		}
	}

	createEffect(() => {
		trackDeep(position)
		untrack(() => {
			body.setTranslation(position, true)
		})
	})

	createEffect(() => {
		const shape = colliderShape()
		if (shape) {
			collider?.setShape(shape)
		}
	})

	createEffect(() => {
		if (!transformControls) return
		if (transformControlsMode() === 'scale') {
			if (selectedShape() === 'ball') {
				transformControls.showX = true
				transformControls.showY = false
				transformControls.showZ = false
			}
			if (selectedShape() === 'cuboid') {
				transformControls.showX = true
				transformControls.showY = true
				transformControls.showZ = true
			}
			if (selectedShape() === 'capsule' || selectedShape() === 'cylinder') {
				transformControls.showX = true
				transformControls.showY = true
				transformControls.showZ = false
			}
		} else {
			transformControls.showX = true
			transformControls.showY = true
			transformControls.showZ = true
		}
	})

	const getColliderSize = (shape: Shape) => {
		switch (shape) {
			case 'ball':return { x: size.x }
			case 'cuboid':return { x: size.x, y: size.y, z: size.z }
			case 'capsule':return { x: size.x, y: size.y }
			case 'cylinder':return { x: size.x, y: size.y }
		}
	}

	const modelOptions = () => {
		const linkedCategoryValue = linkedCategory()
		if (linkedCategoryValue !== null && selectedShape() === 'link') {
			return Object.keys(entities[linkedCategoryValue])
				.filter(model => boundingBox?.[linkedCategoryValue] && model in boundingBox?.[linkedCategoryValue] && boundingBox[linkedCategoryValue][model].collider?.type !== 'link')
				.sort((a, b) => a.localeCompare(b))
				.map((model) => {
					return (
						<option
							selected={linkedModel() === model}
							value={model}
						>
							{model}
						</option>
					)
				})
		}
		return <></>
	}
	createEffect(() => {
		linkedCategory(selectedCategory())
	})

	createEffect(
		on(
			() => [
				selectedShape(),
				linkedCategory(),
				linkedModel(),
				unwrap(position),
				unwrap(size),
				tags(),
			],
			() => {
				if (loading) return

				const category = selectedCategory()
				const asset = selectedAsset()
				const type = selectedShape()
				const linkedCategoryValue = linkedCategory()
				const linkedModelValue = linkedModel()
				const p = unwrap(position)

				if (category && asset && type) {
					let newAssetData: AssetData | null = null

					if (type === 'link') {
						if (linkedCategoryValue && linkedModelValue) {
							newAssetData = {
								collider: {
									type: 'link',
									category: linkedCategoryValue,
									model: linkedModelValue,
								},
								tags: tags(),
							}
						}
					} else {
						const sizeVal = getColliderSize(type as Shape)
						newAssetData = {
							collider: { type, size: sizeVal, position: p },
							secondaryColliders: [],
							scale: boundingBox[category]?.[asset]?.scale ?? undefined,
							tags: tags(),
						}
					}

					if (newAssetData) {
						boundingBox[category][asset] = newAssetData!
					}
				}
			},
			{ defer: loading },
		),
	)
	onCleanup(() => {
		world.removeRigidBody(body)
	})

	css/* css */`
	.range-input{
		display: grid;
		grid-template-columns:auto 1fr;
		background: var(--color-1);
		gap: 1rem;
		padding: 1rem;
	}
	`
	return (
		<>
			<section>
				<div class="title">Collision Box</div>
				<div style="display: grid;grid-template-columns: 1fr auto auto">
					<select onChange={e => selectedShape(e.target.value as Shape)}>
						<For each={entries(colliderShapes)}>
							{([key, val]) => (
								<option
									selected={selectedShape() === val}
									value={val}
								>
									{key}
								</option>
							)}
						</For>
						<option
							selected={selectedShape() === 'link'}
							value="link"
						>
							Link
						</option>
					</select>
					<Show when={selectedShape() !== undefined && selectedShape() !== 'link'}>
						<button onClick={setAutoSize}><Fa icon={faA} /></button>
					</Show>
				</div>
				<Show when={selectedShape() === 'link'}>
					<select onChange={(e) => {
						linkedModel(null)
						linkedCategory(e.target.value)
					}}
					>
						<For each={Object.keys(entities)}>
							{category => (
								<option
									selected={linkedCategory() === category}
									value={category}
								>
									{category}
								</option>
							)}
						</For>
					</select>
					<select onChange={e => e.target.value !== '' && linkedModel(e.target.value)}>
						{modelOptions()}
						<option
							value=""
						>
						</option>
					</select>
				</Show>
			</section>

			<Tags tags={tags} tagsList={tagsList} saveTagsList={saveTagsList}></Tags>
		</>
	)
}