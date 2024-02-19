import type { Object3D, Object3DEventMap } from 'three'
import { AmbientLight, DirectionalLight, LinearSRGBColorSpace, OrthographicCamera, Scene, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { getScreenBuffer } from '@/utils/buffer'
import { outlinePass } from '@/shaders/PixelOutlineMaterial'

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
	camera.updateProjectionMatrix()
	const light = new DirectionalLight(0xFFFFFF, 3)
	light.position.set(0, 5, 0)
	light.lookAt(new Vector3(0, 0, 0))
	scene.add(light)
	scene.add(new AmbientLight(0xFFFFFF, 1))
	const getCanvas = (model: Object3D<Object3DEventMap>) => {
		const clone = model.clone()
		scene.add(clone)

		camera.lookAt(new Vector3(0, 0.3, 0))
		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
		const buffer = getScreenBuffer(SIZE, SIZE)
		buffer.drawImage(renderer.domElement, 0, 0, SIZE, SIZE)
		clone.removeFromParent()
		return buffer.canvas
	}
	return { getCanvas }
}