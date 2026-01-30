import type { Tags } from '@assets/tagsList'
import type { Collider, World } from '@dimforge/rapier3d-compat'
import type { Accessor } from 'solid-js'

import type { Atom } from 'solid-use/atom'
import type { Object3D, Scene, Vector3Like } from 'three'
import type { TransformControls } from 'three-stdlib'
import type { AssetData, EditorTags } from '../types'
// import type { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import type { RapierDebugRenderer } from '@/lib/debugRenderer'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { faA } from '@fortawesome/free-solid-svg-icons'
import { debounce } from '@solid-primitives/scheduled'
import Fa from 'solid-fa'
import { createEffect, createMemo, For, on, onCleanup, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'

import atom from 'solid-use/atom'
import { Box3, BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { entries } from '../../../src/utils/mapFunctions'
import { TagsEditor } from './TagsEditor'

type Shape = 'cuboid' | 'ball' | 'capsule' | 'cylinder'

export function EntityProps({
	model,
	selectedCategory,
	selectedAsset,
	boundingBox,
	entities,
	tagsList,
	saveTagsList,
	transformControls,
	scene,
	world,
}: {
	world: World
	model: Accessor<Object3D | null>
	selectedCategory: Accessor<string | null>
	selectedAsset: Accessor<string | null>
	boundingBox: Record<string, Record<string, AssetData>>
	entities: Record<string, Record<string, Object3D>>
	transformControlsMode: Atom<'translate' | 'scale' | 'rotate'>
	debugRenderer: RapierDebugRenderer
	tagsList: Atom<EditorTags>
	saveTagsList: (tags: EditorTags) => void
	transformControls: TransformControls
	scene: Scene
}) {
	const colliderShapes: Record<string, Shape | undefined> = {
		None: undefined,
		Box: 'cuboid',
		Sphere: 'ball',
		Capsule: 'capsule',
		Cylinder: 'cylinder',
	}
	const group = new Group()
	let mesh: Object3D | null = null
	const body = world.createRigidBody(RigidBodyDesc.fixed())
	let collider: Collider | null = null
	onMount(() => {
		scene.add(group)
	})
	onCleanup(() => {
		group.removeFromParent()
	})

	const selectedShape = atom<Shape | 'link' | undefined>(undefined)
	const linkedCategory = atom<string | null>(null)
	const linkedModel = atom<string | null>(null)
	const tags = atom<Partial<Tags>>({})
	const size = atom<Vector3Like | null>(null)
	const position = atom<Vector3Like | null>(null)
	const geo = createMemo(() => {
		switch (selectedShape()) {
			case 'ball': return new SphereGeometry(0.5)
			case 'capsule': return new CapsuleGeometry(0.5)
			case 'cuboid': return new BoxGeometry()
			case 'cylinder': return new CylinderGeometry(0.5, 0.5)
			default: return null
		}
	})
	const computedSize = createMemo(() => {
		const s = size()
		if (!s) return null
		switch (selectedShape()) {
			case 'ball': return { x: s.x, y: s.x, z: s.x }
			case 'cylinder':
			case 'capsule': return { x: s.x, y: s.y, z: s.x }
			default: return s
		}
	})
	const colShape = createMemo(() => {
		const size = computedSize()
		if (!size) return null
		switch (selectedShape()) {
			case 'ball': return ColliderDesc.ball(size.x)
			case 'capsule': return ColliderDesc.capsule(size.x, size.y)
			case 'cuboid': return ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
			case 'cylinder': return ColliderDesc.cylinder(size.y / 2, size.x / 2)
			default: return null
		}
	})

	const update = debounce(() => {
		if (mesh) {
			size({ x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z })
			position({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z })
		}
	}, 100)

	onMount(() => {
		transformControls.addEventListener('change', update)
	})
	onCleanup(() => {
		transformControls.removeEventListener('change', update)
	})

	createEffect(on(
		() => [selectedCategory(), selectedAsset()],
		() => {
			selectedShape(undefined)
			transformControls.detach()
			const category = selectedCategory()
			const asset = selectedAsset()
			if (category && asset) {
				boundingBox[category] ??= {}
				boundingBox[category][asset] ??= {}
				const collider = boundingBox[category][asset].collider
				if (collider && collider.type !== 'link') {
					selectedShape(collider.type)
					size(collider.size)
					position(collider.position)
				} else {
					size(null)
					position(null)
				}
				if (boundingBox[category][asset].tags) {
					tags(boundingBox[category][asset].tags)
				} else {
					tags({})
				}
			}
		},
	))

	createEffect(on(colShape, (colShape) => {
		if (collider) {
			world.removeCollider(collider, true)
		}
		if (colShape) {
			collider = world.createCollider(colShape, body)
		}
	}))

	createEffect(on(geo, (geo) => {
		mesh?.removeFromParent()

		if (geo) {
			const col = new Mesh(geo, new MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.2 }))
			if (selectedShape() === 'capsule') {
				col.position.set(0, 1, 0)
			} else {
				col.position.set(0, 0.5, 0)
			}
			mesh = new Group()
			mesh.add(col)
			transformControls.attach(mesh)
			group.add(transformControls)
			group.add(mesh)
		}
	}))

	createEffect(on(computedSize, (size) => {
		if (size && mesh) {
			mesh.scale.copy(size)
		}
	}))
	createEffect(on(position, (pos) => {
		const size = computedSize()
		if (pos && mesh) {
			mesh.position.copy(pos)
			if (size) {
				body.setTranslation({
					x: pos.x,
					y: pos.y + size.y / 2,
					z: pos.z,
				}, true)
			}
		}
	}))

	const setAutoSize = () => {
		const m = model()
		if (m) {
			const box = new Box3().setFromObject(m)
			const sizeTemp = new Vector3()
			box.getSize(sizeTemp)
			if (selectedShape() === 'capsule') {
				sizeTemp.x /= 2
				sizeTemp.y /= 2
			}
			size({ x: sizeTemp.x, y: sizeTemp.y, z: sizeTemp.z })
			const posTemp = new Vector3()
			box.getCenter(posTemp)
			position({ x: posTemp.x, y: posTemp.y - sizeTemp.y / 2, z: posTemp.z })
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

	createEffect(
		on(
			() => [
				selectedShape(),
				linkedCategory(),
				linkedModel(),
				position(),
				size(),
				tags(),
			],
			() => {
				const category = selectedCategory()
				const asset = selectedAsset()
				const type = selectedShape()
				const linkedCategoryValue = linkedCategory()
				const linkedModelValue = linkedModel()
				const p = position()
				const s = size()

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
					} else if (s && p) {
						newAssetData = {
							collider: { type, size: s, position: p },
							secondaryColliders: [],
							scale: boundingBox[category]?.[asset]?.scale ?? undefined,
							tags: tags(),
						}
					}

					if (newAssetData) {
						boundingBox[category] ??= {}
						boundingBox[category][asset] = newAssetData!
					}
				}
			},
		),
	)
	// onCleanup(() => {
	// 	world.removeRigidBody(body)
	// })

	css/* css */`
	.range-input{
		display: grid;
		grid-template-columns:auto 1fr;
		background: var(--color-1);
		gap: 1rem;
		padding: 1rem;
	}
	.vec3-display{
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		display-items: center;
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
				<Show when={size()}>
					{size => (
						<div>
							<div class="title">Size</div>
							<div class="vec3-display">
								<div>
									X:
									{size().x?.toFixed(1)}
								</div>
								<div>
									Y:
									{size().y?.toFixed(1)}
								</div>
								<div>
									Z:
									{size().z?.toFixed(1)}
								</div>
							</div>
						</div>
					)}
				</Show>
				<Show when={position()}>
					{position => (
						<div>
							<div class="title">Position</div>
							<div class="vec3-display">
								<div>
									X:
									{position().x.toFixed(1)}
								</div>
								<div>
									Y:
									{position().y.toFixed(1)}
								</div>
								<div>
									Z:
									{position().z.toFixed(1)}
								</div>
							</div>
						</div>
					)}
				</Show>
				<Show when={selectedShape()}>
					<button
						style="width: 100%"
						onClick={() => position({ x: 0, y: 0, z: 0 })}
					>
						Reset position
					</button>
				</Show>
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

			<TagsEditor tags={tags} tagsList={tagsList} saveTagsList={saveTagsList}></TagsEditor>
		</>
	)
}