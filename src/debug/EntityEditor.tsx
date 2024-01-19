import type { With } from 'miniplex'
import type { Accessor, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import { set } from 'idb-keyval'
import { Box3, Euler, Object3D, Quaternion, Vector3 } from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { CollidersData, LevelData } from './LevelEditor'
import { props } from './props'
import { cameraQuery, renderer, scene } from '@/global/rendering'
import { assets, ecs } from '@/global/init'
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
	const modelCollider = createMemo(() => colliderData()[entityData().model])
	const updateEntity = (newEntity: Partial<LevelData[string]>) => {
		setLevelData({ ...levelData, [entity().entityId]: { ...entityData(), ...newEntity } })
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
	const [editingCollider, setEditingCollider] = createSignal(false)
	createEffect(() => {
		if (editingCollider()) {
			ecs.update(entity(), 'debugCollider', true)
			const box = entity().debugColliderMesh
			if (box) {
				transform.attach(box)
			}
		} else {
			transform.attach(dummy)
			ecs.removeComponent(entity(), 'debugCollider')
		}
	})
	const transformListener = () => {
		if (editingCollider()) {
			const size = new Vector3()
			new Box3().setFromObject(entity().debugColliderMesh!).getSize(size)
			setColliderData({
				...colliderData(),
				[entityData().model]: {
					...modelCollider(),
					size: size.toArray(),
					offset: entity().debugColliderMesh!.position.clone().multiply(new Vector3(1, 1, -1)).toArray(),
				},
			})

			set('colliderData', colliderData())
		} else {
			entity().position.set(dummy.position.x, dummy.position.y, dummy.position.z)
			entity().rotation.setFromEuler(dummy.rotation)
			updateEntity({ position: entity().position.toArray(), rotation: entity().rotation.toJSON() })
		}
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
		const collider = colliderData()[entityData().model]
		ecs.removeComponent(entity(), 'body')
		ecs.removeComponent(entity(), 'bodyDesc')
		ecs.removeComponent(entity(), 'collider')
		ecs.removeComponent(entity(), 'colliderDesc')
		ecs.removeComponent(entity(), 'size')
		if (collider) {
			const size = new Vector3()
			if (collider.size) {
				size.set(...collider.size)
			} else {
				const boxSize = new Box3().setFromObject(model)
				boxSize.getSize(size)
			}
			ecs.update(entity(), {
				bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
				colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setSensor(collider.sensor).setTranslation(...collider.offset),
				size,
			})
		}
		ecs.addComponent(entity(), 'model', model)
	})

	const deleteSelected = () => {
		ecs.remove(entity())
		delete levelData()[entity().entityId]
		set('levelData', levelData())
		setSelectedEntity(null)
	}

	return (
		<div>
			<For each={['translate', 'rotate', 'scale'] as const}>
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
					checked={Boolean(modelCollider())}
					onChange={() => {
						if (modelCollider()) {
							setColliderData({ ...colliderData(), [entityData().model]: null })
						} else {
							setColliderData({
								...colliderData(),
								[entityData().model]: {
									type: RigidBodyType.Fixed,
									sensor: false,
									offset: [0, 0, 0],
								},
							})
						}
						set('colliderData', colliderData())
					}}
				>
				</input>
			</div>
			<div>
				edit collider
				<input
					type="checkbox"
					checked={editingCollider()}
					onChange={e => setEditingCollider(e.target.checked)}
				>
				</input>

			</div>
			<div>
				collider type
				<select onChange={e => setColliderData({
					...colliderData(),
					[entityData().model]: {
						...modelCollider(),
						type: Number(e.target.value),
					},
				})}
				>
					<option value={RigidBodyType.Fixed}>Fixed</option>
					<option value={RigidBodyType.Dynamic}>Dynamic</option>
				</select>
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
}