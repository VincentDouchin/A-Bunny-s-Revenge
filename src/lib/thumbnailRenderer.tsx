import type { JSXElement } from 'solid-js'
import type { Object3D } from 'three/webgpu'
import { onCleanup, onMount } from 'solid-js'
import atom from 'solid-use/atom'
import { SkeletonUtils } from 'three/addons'
import { AmbientLight, LinearSRGBColorSpace, OrthographicCamera, Scene, Vector3, WebGPURenderer } from 'three/webgpu'
import { getScreenBuffer } from '@/utils/buffer'
import { getSize } from './models'

export class Thumbnailer {
	scene: Scene
	camera: OrthographicCamera
	renderer: WebGPURenderer
	size = 24
	private constructor(renderer: WebGPURenderer, size: number) {
		this.size = size
		this.renderer = renderer
		this.camera = new OrthographicCamera()
		this.scene = new Scene()
		this.scene.add(this.camera)
		this.camera.position.set(0, 1, 1)
		this.camera.zoom = 2.3
		this.camera.lookAt(new Vector3(0, 0.3, 0))
		this.camera.updateProjectionMatrix()
		this.scene.add(new AmbientLight(0xFFFFFF, 2))
		renderer.setSize(this.size, this.size, false)
		renderer.outputColorSpace = LinearSRGBColorSpace
	}

	element() {
		return this.renderer.domElement
	}

	render() {
		this.renderer.render(this.scene, this.camera)
	}

	private async init() {
		await this.renderer.init()
		return this
	}

	static async create(size = 24) {
		const renderer = new WebGPURenderer({ alpha: true })
		const thumbnailer = new Thumbnailer(renderer, size)
		return await thumbnailer.init()
	}

	getCanvas(obj: Object3D, scale = true, zoom = 2.3) {
		const model = SkeletonUtils.clone(obj)
		if (scale) {
			const size = getSize(model)
			const maxSize = Math.max(size.x, size.y, size.z)
			model.scale.multiplyScalar(1 / maxSize)
		}
		this.camera.zoom = zoom
		this.scene.add(model)
		this.renderer.render(this.scene, this.camera)
		const buffer = getScreenBuffer(this.size, this.size)
		buffer.drawImage(this.renderer.domElement, 0, 0, this.size, this.size)
		model.removeFromParent()
		return buffer.canvas
	}

	dispose() {
		this.renderer.dispose()
	}

	spin({ obj }: { obj: Object3D, children: JSXElement }) {
		const renderer = atom<Thumbnailer | null>(null)
		onMount(async () => {
			renderer(await Thumbnailer.create())
			renderer()?.scene.add(obj)
		})
		onCleanup(() => {
			obj.removeFromParent()
			renderer()?.dispose()
		})

		return {

			update: (delta: number) => {
				const rendererValue = renderer()
				if (rendererValue) {
					rendererValue.render()
					obj.rotateY(delta * 2)
				}
			},
		}
	}
}