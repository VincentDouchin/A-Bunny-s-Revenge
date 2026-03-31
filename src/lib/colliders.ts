import type { AssetData, ColliderData, Shape } from 'editor/src/types'
import type { With } from 'miniplex'
import type { Object3D, Object3DEventMap, Vector3Tuple } from 'three/webgpu'
import type { Entity } from '@/global/entity'
import boundingBoxes from '@assets/boundingBox.json'
import { ActiveCollisionTypes, Ball, Capsule, ColliderDesc, Cuboid, Cylinder, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'

import { SkeletonUtils } from 'three/addons'
import { BufferGeometry, Mesh, MeshStandardNodeMaterial, Quaternion, Vector3 } from 'three/webgpu'
import { getSize } from './models'

export const cloneMaterials = (obj: Object3D) => {
	obj.traverse((node) => {
		if (node instanceof Mesh && node.material instanceof MeshStandardNodeMaterial) {
			const mat = node.material.clone()
			mat.map = node.material.map
			node.material = mat
		}
	})
}

export const modelColliderBundle = (model: Object3D<Object3DEventMap>, type = RigidBodyType.Dynamic, sensor = false, size?: Vector3, shape: 'ball' | 'cuboid' = 'cuboid') => {
	const cloneModel = SkeletonUtils.clone(model)
	cloneMaterials(cloneModel)
	size ??= getSize(cloneModel)
	const collideDesc = {
		ball: ColliderDesc.ball(Math.max(Math.abs(size.x), Math.abs(size.z)) / 2),
		cuboid: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2),
	}[shape]
	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: collideDesc
			.setTranslation(0, size.y / 2, 0)
			.setSensor(sensor)
			.setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}

export const getColliderShape = (shape: Shape, size: { x: number; y?: number; z?: number }, scale?: [number, number, number]) => {
	const [sx, sy, sz] = scale ?? [1, 1, 1]
	switch (shape) {
		case 'cuboid':
			return new Cuboid((size.x / 2) * sx, (size.y! / 2) * sy, (size.z! / 2) * sz)
		case 'ball':
			return new Ball((size.x / 2) * sx)
		case 'capsule':
			return new Capsule((size.y! / 2) * sy, (size.x / 2) * sx)
		case 'cylinder':
			return new Cylinder((size.y! / 2) * sy, (size.x / 2) * sx)
	}
}
export const createTrimeshCollider = (model: Object3D, scale: Vector3Tuple) => {
	model.scale.fromArray(scale)
	model.updateWorldMatrix(true, true)

	const allVertices: number[] = []
	const allIndices: number[] = []
	let vertexOffset = 0

	model.traverse((object) => {
		if (object instanceof Mesh && object.geometry instanceof BufferGeometry) {
			const geometry = object.geometry.clone()
			geometry.applyMatrix4(object.matrixWorld)

			const position = geometry.getAttribute('position')
			const indices = geometry.index

			if (!indices) {
				console.warn('Mesh without indices, skipping')
				return
			}

			// Add vertices
			allVertices.push(...position.array)

			// Add indices with offset
			for (let i = 0; i < indices.count; i++) {
				allIndices.push(indices.getX(i) + vertexOffset)
			}

			// Update offset for next mesh
			vertexOffset += position.count
		}
	})

	if (allVertices.length === 0) {
		throw new Error('Cannot generate trimesh collider from model')
	}

	// Return single merged trimesh collider
	return ColliderDesc.trimesh(new Float32Array(allVertices), new Uint32Array(allIndices))
}
const processColliderData = (colliderData: ColliderData, model: Object3D, computedScale: [number, number, number]): ColliderDesc => {
	if (colliderData.type === 'trimesh') {
		return createTrimeshCollider(model, computedScale)
	}

	if (colliderData.type === 'link') {
		throw new Error('Links should be resolved before processing')
	}

	const size = colliderData.size
	const shape = getColliderShape(colliderData.type, size, computedScale)
	const pos = new Vector3().copy(colliderData.position).multiply({ x: computedScale[0], y: computedScale[1], z: computedScale[2] })
	const rot = colliderData.rotation
	return new ColliderDesc(shape).setTranslation(pos.x, pos.y, pos.z).setRotation(new Quaternion().fromArray(rot))
}

export const getBodyAndColliders = (assetData: AssetData, model: Object3D, entityScale: [number, number, number]): With<Entity, 'bodyDesc'> => {
	const bodyDesc = RigidBodyDesc.fixed()

	if (!assetData?.collider) {
		throw new Error('collider not defined')
	}

	// Resolve link if needed (single level only)
	let resolvedData = assetData
	if (assetData.collider.type === 'link') {
		const linkedData = (boundingBoxes as unknown as Record<string, Record<string, AssetData>>)?.[assetData.collider.category]?.[assetData.collider.model]

		if (!linkedData) {
			throw new Error(`Link target not found: ${assetData.collider.category}:${assetData.collider.model}`)
		}

		resolvedData = linkedData
	}

	const computedScale = entityScale.map((s, i) => Math.abs(s * (resolvedData.scale?.[i] ?? 1))) as [number, number, number]

	const colliderDesc = processColliderData(resolvedData.collider!, model, computedScale)

	const secondaryCollidersDesc: ColliderDesc[] = []
	if (resolvedData.secondaryColliders) {
		for (const secondaryData of resolvedData.secondaryColliders) {
			secondaryCollidersDesc.push(processColliderData(secondaryData, model, computedScale))
		}
	}

	return {
		bodyDesc,
		colliderDesc,
		secondaryCollidersDesc,
	}
}

export const capsuleColliderBundle = (model: Object3D<Object3DEventMap>, size: Vector3) => {
	const cloneModel = SkeletonUtils.clone(model)
	return {
		model: cloneModel,
		bodyDesc: RigidBodyDesc.kinematicPositionBased().lockRotations(),
		colliderDesc: ColliderDesc.capsule(size.y / 2, size.x / 2)
			.setTranslation(0, size.y / 2 + size.x / 2, 0)
			.setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}
