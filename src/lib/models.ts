import type { Object3D, Object3DEventMap } from 'three/webgpu'
import type { Constructor } from 'type-fest'
import { Box3, Vector3 } from 'three/webgpu'

export const getSize = (model: Object3D<Object3DEventMap>) => {
	const size = new Vector3()
	const boxSize = new Box3().setFromObject(model)
	boxSize.getSize(size)
	return size
}

export const traverseFind = <T extends Constructor<Object3D<Object3DEventMap>> = Constructor<Object3D<Object3DEventMap>>>(
	obj: Object3D<Object3DEventMap>,
	fn: (node: Object3D<Object3DEventMap>) => boolean,
	instance?: T,
): InstanceType<T> | null => {
	let result: InstanceType<T> | null = null

	obj.traverse((node) => {
		if (fn(node) && (!instance || node instanceof instance)) {
			result = node as InstanceType<T>
		}
	})
	return result
}
