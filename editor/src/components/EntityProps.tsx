import type { Collider, World } from '@dimforge/rapier3d-compat'
import type { Accessor } from 'solid-js'
import type { Mesh, Object3D } from 'three'
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import type { AssetData } from '../types'
import { Ball, Capsule, ColliderDesc, Cuboid, Cylinder, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { faA, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'

import { createEffect, createMemo, For, on, onCleanup, onMount, Show } from 'solid-js'
import { createMutable } from 'solid-js/store'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Box3, Vector3 } from 'three'

import { entries } from '../../../src/utils/mapFunctions'

type Shape = 'cuboid' | 'ball' | 'capsule' | 'cylinder'

export function EntityProps({ world, model, selectedCategory, selectedAsset, addTransformControls, boundingBox }: {
	world: World
	model: Accessor<Object3D | null>
	selectedCategory: Accessor<string | null>
	selectedAsset: Accessor<string | null>
	addTransformControls: () => [Mesh, TransformControls]
	boundingBox: Record<string, Record<string, AssetData>>

}) {
	const colliderShapes: Record<string, Shape | undefined> = {
		None: undefined,
		Box: 'cuboid',
		Sphere: 'ball',
		Capsule: 'capsule',
		Cylinder: 'cylinder',
	}
	const body = world.createRigidBody(RigidBodyDesc.fixed())
	const collider = atom<Collider | null>(null)
	const size = createMutable(new Vector3(1, 1, 1))
	const selectedShape = atom<Shape | undefined>(undefined)

	const dummy = atom<Mesh | null>(null)
	const transformControls = atom<TransformControls | null>(null)

	const sizeOffet = createMemo(() => {
		switch (selectedShape()) {
			case 'ball' :return size.x / 2
			case 'cuboid' : return size.y / 2
			case 'capsule' : return size.y / 2 + size.x / 2
			case 'cylinder' : return size.y / 2
		}
		return null
	})

	createEffect(() => {
		const y = sizeOffet()
		if (y !== null) {
			dummy()?.position.setY(y)
			body.setTranslation({ x: 0, y, z: 0 }, true)
			world.step()
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

	createEffect<Collider | null>((prev) => {
		if (!collider() && prev) {
			world.removeCollider(prev, true)
		}
		return collider()
	}, null)

	const setExistingBoundingBox = () => {
		collider(null)
		selectedShape(undefined)

		const category = selectedCategory()
		const asset = selectedAsset()
		if (category && asset) {
			const box = boundingBox?.[category]?.[asset]?.collider
			if (box) {
				selectedShape(box.type)
				size.x = box.size.x
				size.y = box.size.y ?? box.size.x
				size.z = box.size.z ?? box.size.x
			} else {
				size.x = 1
				size.y = 1
				size.z = 1
			}
		}
	}
	onMount(setExistingBoundingBox)
	createEffect(on(model, setExistingBoundingBox))

	const setAutoSize = () => {
		const m = model()
		if (m && collider()) {
			const box = new Box3().setFromObject(m)
			const sizeTemp = new Vector3()
			box.getSize(sizeTemp)
			if (selectedShape() === 'capsule') {
				sizeTemp.x /= 2
				sizeTemp.y /= 2
			}
			size.copy(sizeTemp)
		}
	}

	createEffect(() => {
		const shape = colliderShape()
		const coll = collider()
		if (shape) {
			if (!coll) {
				const desc = new ColliderDesc(shape)
				collider(world.createCollider(desc, body))
			}
			collider()?.setShape(shape)
		} else if (coll) {
			collider(null)
		}
	})

	const editCollider = () => {
		if (!transformControls()) {
			const [dummyMesh, controls] = addTransformControls()
			dummyMesh.scale.copy(size)

			controls.setMode('scale')
			dummy(dummyMesh)
			transformControls(controls)
		}
	}

	createEffect(() => {
		const controls = transformControls()
		if (!controls) return
		if (selectedShape() === 'ball') {
			controls.showX = true
			controls.showY = false
			controls.showZ = false
		}
		if (selectedShape() === 'cuboid') {
			controls.showX = true
			controls.showY = true
			controls.showZ = true
		}
		if (selectedShape() === 'capsule') {
			controls.showX = true
			controls.showY = true
			controls.showZ = false
		}
	})

	createEffect(() => {
		transformControls()?.addEventListener('change', () => {
			const d = dummy()
			if (d) {
				size.x = Math.abs(d.scale.x)
				size.y = Math.abs(d.scale.y)
				size.z = Math.abs(d.scale.z)
			}
		})
	})
	createEffect(() => {
		if (!collider()) {
			transformControls()?.detach()
			transformControls()?.removeFromParent()
			dummy()?.removeFromParent()
			transformControls(null)
			dummy(null)
		}
	})

	const getColliderSize = (shape: Shape) => {
		const { x, y, z } = size
		switch (shape) {
			case 'ball':return { x }
			case 'cuboid':return { x, y, z }
			case 'capsule':return { x, y }
			case 'cylinder':return { x, y }
		}
	}

	createEffect(() => {
		const category = selectedCategory()
		const asset = selectedAsset()
		const type = selectedShape()
		if (category && asset && type) {
			const size = getColliderSize(type)
			boundingBox[category] ??= {}
			boundingBox[category][asset] = { collider: { type, size }, secondaryColliders: [] }
		}
	})
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
			<div>
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
					</select>

					<Show when={selectedShape() !== undefined && selectedShape()}>

						<button onClick={setAutoSize}><Fa icon={faA} /></button>
						<button onClick={editCollider}><Fa icon={faPenToSquare} /></button>
					</Show>
				</div>
			</div>
		</>
	)
}