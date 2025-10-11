import type { Object3D, Object3DEventMap } from 'three'
import { AmbientLight, LinearSRGBColorSpace, OrthographicCamera, Scene, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { getSize } from '@/lib/models'
import { outlinePass } from '@/shaders/PixelOutlineMaterial'
import { getScreenBuffer } from '@/utils/buffer'

export const getThumbnailRenderer = (size = 24, zoom = 1): ThumbnailRenderer => {
	const renderer = new WebGLRenderer({ alpha: true })
	const target = new WebGLRenderTarget(size, size)

	renderer.setSize(size, size)
	renderer.outputColorSpace = LinearSRGBColorSpace
	const outlineQuad = new FullScreenQuad(outlinePass(target.texture, new Vector2(size, size)))
	const camera = new OrthographicCamera()
	const scene = new Scene()
	scene.add(camera)
	camera.position.set(0, 1, -1)
	camera.zoom = 2.3 * zoom
	camera.lookAt(new Vector3(0, 0.3, 0))
	camera.updateProjectionMatrix()
	scene.add(new AmbientLight(0xFFFFFF, 2))
	const getCanvas = (model: Object3D<Object3DEventMap>, scale = false, zoom = 2.3) => {
		const cloneModel = clone(model)
		if (scale) {
			const size = getSize(cloneModel)
			const maxSize = Math.max(size.x, size.y, size.z)
			cloneModel.scale.multiplyScalar(1 / maxSize)
		}
		scene.add(cloneModel)
		camera.zoom = zoom
		camera.updateProjectionMatrix()
		renderer.setRenderTarget(target)
		renderer.render(scene, camera)
		renderer.setRenderTarget(null)
		outlineQuad.render(renderer)
		const buffer = getScreenBuffer(size, size)
		buffer.drawImage(renderer.domElement, 0, 0, size, size)
		cloneModel.removeFromParent()
		return buffer.canvas
	}
	let spinModel: Object3D | null = null
	const render = () => {
		renderer.render(scene, camera)
	}
	const spin = (model: Object3D<Object3DEventMap>) => {
		spinModel = model
		scene.add(model)
		camera.position.set(0, 1, -1)
		camera.zoom = 2.3
		camera.lookAt(new Vector3(0, 0.3, 0))
		camera.updateProjectionMatrix()
		render()

		return () => {
			spinModel = null
			model?.rotation.set(0, 0, 0)
			model?.removeFromParent()
		}
	}
	const update = (deltaTime: number) => {
		if (spinModel) {
			spinModel?.rotateY(deltaTime)
		}
	}

	const dispose = () => {
		renderer.dispose()
	}
	return { getCanvas, spin, dispose, update, element: renderer.domElement }
}
export interface ThumbnailRenderer {
	getCanvas: (model: Object3D, scale?: boolean, zoom?: number) => HTMLCanvasElement
	spin: (model: Object3D) => () => void
	dispose: () => void
	update: (deltaTime: number) => void
	element: HTMLCanvasElement
}