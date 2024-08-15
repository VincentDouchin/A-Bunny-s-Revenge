import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Box3, BufferGeometry, Mesh, Quaternion, Vector3 } from 'three'

import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Constructor } from 'type-fest'
import type { CollidersData, ModelName } from '@/debug/LevelEditor'
import type { Entity } from '@/global/entity'
import { world } from '@/global/init'

const cloneMaterials = (model: Object3D<Object3DEventMap>) => {
	model.traverse((node) => {
		if (node instanceof Mesh) {
			node.material = node.material.clone()
		}
	})
}
export const getSize = (model: Object3D<Object3DEventMap>) => {
	const size = new Vector3()
	const boxSize = new Box3().setFromObject(model)
	boxSize.getSize(size)
	return size
}

export const getTrimeshCollider = (node: Mesh) => {
	const vertices = new Float32Array(node.geometry.getAttribute('position').array)
	const indices = new Uint32Array(node.geometry.index!.array)
	return ColliderDesc.trimesh(vertices, indices).setTranslation(...node.position.toArray())
}
export const getSecondaryColliders = (model: Object3D) => {
	const secondaryCollidersDesc: ColliderDesc[] = []
	const nodesToRemove: Object3D[] = []
	model.traverse((node) => {
		if (node.name.includes('collider') && node instanceof Mesh && node.geometry instanceof BufferGeometry) {
			nodesToRemove.push(node)
			secondaryCollidersDesc.push(getTrimeshCollider(node))
		}
	})
	nodesToRemove.forEach(node => node.removeFromParent())
	if (secondaryCollidersDesc.length > 0) {
		return { secondaryCollidersDesc } as const satisfies Entity
	}
	return {}
}
export const getBoundingBox = (modelName: ModelName, model: Object3D<Object3DEventMap>, colliderData: CollidersData, scale: number) => {
	const collider = colliderData[modelName]
	const mainCollider = model.getObjectByName('mainCollider')
	if (mainCollider instanceof Mesh && mainCollider.geometry instanceof BufferGeometry) {
		const size = new Vector3()
		mainCollider.scale.copy(model.scale)
		mainCollider.updateMatrix()
		mainCollider.geometry.applyMatrix4(mainCollider.matrix)
		mainCollider.geometry.computeBoundingBox()
		mainCollider.geometry.boundingBox!.getSize(size)
		mainCollider.removeFromParent()
		return {
			bodyDesc: RigidBodyDesc.fixed().lockRotations(),
			colliderDesc: getTrimeshCollider(mainCollider),
			size,
		} as const satisfies Entity
	} else if (collider) {
		const size = new Vector3()
		if (collider.size) {
			size.set(...collider.size)
			size.multiplyScalar(scale)
		} else {
			const boxSize = new Box3().setFromObject(model)
			boxSize.getSize(size)
		}
		if (collider.offset) {
			const offset = new Vector3(...collider.offset)
			return {
				bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
				colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(...offset.multiplyScalar(scale).toArray()).setSensor(collider.sensor).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
				size,
			} as const satisfies Entity
		}
	}
}
export const modelColliderBundle = (model: Object3D<Object3DEventMap>, type = RigidBodyType.Dynamic, sensor = false, size?: Vector3, shape: 'ball' | 'cuboid' = 'cuboid') => {
	const cloneModel = clone(model)
	cloneMaterials(cloneModel)
	size ??= getSize(cloneModel)
	const collideDesc = {
		ball: ColliderDesc.ball(Math.max(Math.abs(size.x), Math.abs(size.z)) / 2),
		cuboid: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2),
	}[shape]
	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: collideDesc.setTranslation(0, size.y / 2, 0).setSensor(sensor).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}

export const capsuleColliderBundle = (model: Object3D<Object3DEventMap>, size: Vector3) => {
	const cloneModel = clone(model)
	return {
		model: cloneModel,
		bodyDesc: RigidBodyDesc.kinematicPositionBased().lockRotations(),
		colliderDesc: ColliderDesc.capsule(size.y / 2, size.x / 2).setTranslation(0, size.y / 2 + size.x / 2, 0).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}

export const characterControllerBundle = () => {
	const controller = world.createCharacterController(0.1)
	controller.setApplyImpulsesToDynamicBodies(true)
	controller.setCharacterMass(0.1)
	controller.enableAutostep(4, 0, false)
	controller.setMaxSlopeClimbAngle(Math.PI / 2 * 1.5)
	return { controller } as const satisfies Entity
}
export const traverseFind = <T extends Constructor<Object3D<Object3DEventMap>> = Constructor<Object3D<Object3DEventMap>>>(obj: Object3D<Object3DEventMap>, fn: (node: Object3D<Object3DEventMap>) => boolean, instance?: T): InstanceType<T> | null => {
	let result: InstanceType<T> | null = null

	obj.traverse((node) => {
		if (fn(node) && (!instance || node instanceof instance)) {
			result = node as InstanceType<T>
		}
	})
	return result
}