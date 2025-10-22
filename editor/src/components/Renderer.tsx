import type { PerspectiveCamera, WebGLRenderer } from 'three'
import { onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'

export function Renderer({ camera, renderer, onPointerDown }: {
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	onPointerDown: (e: PointerEvent) => void
}) {
	css/* css */`
	:global(.level-renderer) {
		height: 100%;
		width: 100%;
	}
	`

	const updateCanvasSize = () => {
		const rect = renderer.domElement.getBoundingClientRect()
		renderer.setSize(rect.width, rect.height, false)
		camera.aspect = rect.width / rect.height
		camera.updateProjectionMatrix()
	}
	window.document.addEventListener('resize', updateCanvasSize)
	onCleanup(() => {
		window.document.removeEventListener('resize', updateCanvasSize)
	})

	onMount(updateCanvasSize)

	renderer.domElement.addEventListener('pointerdown', onPointerDown)
	onCleanup(() => {
		renderer.setAnimationLoop(null)
	})

	return <>{renderer.domElement}</>
}