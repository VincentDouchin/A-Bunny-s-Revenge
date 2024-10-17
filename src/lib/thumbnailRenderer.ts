import type { Object3D, Object3DEventMap } from 'three'
import { coroutines, time } from '@/global/init'
import { outlinePass } from '@/shaders/PixelOutlineMaterial'
import { getScreenBuffer } from '@/utils/buffer'
import { AmbientLight, LinearSRGBColorSpace, OrthographicCamera, Scene, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { getSize } from './models'

export const thumbnailRenderer = (size = 24) => {
	const renderer = new WebGLRenderer({ alpha: true })
	const target = new WebGLRenderTarget(size, size)

	renderer.setSize(size, size)
	renderer.outputColorSpace = LinearSRGBColorSpace
	const outlineQuad = new FullScreenQuad(outlinePass(target.texture, new Vector2(size, size)))
	const camera = new OrthographicCamera()
	const scene = new Scene()
	scene.add(camera)
	camera.position.set(0, 1, -1)
	camera.zoom = 2.3
	camera.lookAt(new Vector3(0, 0.3, 0))
	camera.updateProjectionMatrix()
	scene.add(new AmbientLight(0xFFFFFF, 2))
	const getCanvas = (model: Object3D<Object3DEventMap>, scale = false, zoom = 2.3) => {
		const clone = model.clone()
		if (scale) {
			const size = getSize(clone)
			const maxSize = Math.max(size.x, size.y, size.z)
			clone.scale.multiplyScalar(1 / maxSize)
		}
		scene.add(clone)
		camera.zoom = zoom
		camera.updateProjectionMatrix()
		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
		const buffer = getScreenBuffer(size, size)
		buffer.drawImage(renderer.domElement, 0, 0, size, size)
		clone.removeFromParent()
		return buffer.canvas
	}
	const render = () => {
		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
	}
	const spin = (model: Object3D<Object3DEventMap>) => {
		scene.add(model)
		camera.position.set(0, 1, -1)
		camera.zoom = 2.3
		camera.lookAt(new Vector3(0, 0.3, 0))
		camera.updateProjectionMatrix()
		render()
		let spinAmount = 0.0025
		const existingCoroutine = coroutines.add(function*() {
			while (true) {
				render()
				model?.rotateY(spinAmount * time.delta)
				yield
			}
		})
		const clear = () => {
			model?.rotation.set(0, 0, 0)
			model?.removeFromParent()
			existingCoroutine && existingCoroutine()
		}
		const setSpinAmount = (fn: (amount: number) => number) => spinAmount = fn(spinAmount)
		return { element: renderer.domElement, clear, setSpinAmount }
	}

	const dispose = () => {
		renderer.dispose()
	}
	return { getCanvas, spin, dispose }
}