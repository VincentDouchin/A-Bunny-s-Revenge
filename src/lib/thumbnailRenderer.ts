import type { Object3D, Object3DEventMap } from 'three'
import { AmbientLight, LinearSRGBColorSpace, OrthographicCamera, Scene, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { coroutines, time } from '@/global/init'
import { outlinePass } from '@/shaders/PixelOutlineMaterial'
import { getScreenBuffer } from '@/utils/buffer'

const SIZE = 24

export const thumbnailRenderer = () => {
	const renderer = new WebGLRenderer({ alpha: true })
	const target = new WebGLRenderTarget(SIZE, SIZE)

	renderer.setSize(SIZE, SIZE)
	renderer.outputColorSpace = LinearSRGBColorSpace
	const outlineQuad = new FullScreenQuad(outlinePass(target.texture, new Vector2(SIZE, SIZE)))
	const camera = new OrthographicCamera()
	const scene = new Scene()
	scene.add(camera)
	camera.position.set(0, 1, -1)
	camera.zoom = 2.3
	camera.lookAt(new Vector3(0, 0.3, 0))
	camera.updateProjectionMatrix()
	scene.add(new AmbientLight(0xFFFFFF, 2))
	const getCanvas = (model: Object3D<Object3DEventMap>) => {
		const clone = model.clone()
		scene.add(clone)

		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
		const buffer = getScreenBuffer(SIZE, SIZE)
		buffer.drawImage(renderer.domElement, 0, 0, SIZE, SIZE)
		clone.removeFromParent()
		return buffer.canvas
	}
	const render = () => {
		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
	}
	const spin = (existingClone: Object3D<Object3DEventMap>) => {
		scene.add(existingClone)
		camera.position.set(0, 1, -1)
		camera.zoom = 2.3
		camera.lookAt(new Vector3(0, 0.3, 0))
		camera.updateProjectionMatrix()
		render()
		const existingCoroutine = coroutines.add(function*() {
			while (true) {
				render()
				existingClone?.rotateY(0.0025 * time.delta)
				yield
			}
		})
		const clear = () => {
			existingClone?.rotation.set(0, 0, 0)
			existingClone?.removeFromParent()
			existingCoroutine && existingCoroutine()
		}
		return { element: renderer.domElement, clear }
	}

	return { getCanvas, spin }
}