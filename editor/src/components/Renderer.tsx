import type { PerspectiveCamera, WebGLRenderer } from 'three'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'

export function Renderer({ camera, renderer, onPointerDown, cssRenderer }: {
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	onPointerDown: (e: PointerEvent) => void
	cssRenderer: CSS2DRenderer
}) {
	css/* css */`
	:global(.level-renderer) {
		position: absolute;
		inset: 0;
	}
	:global(.renderer){
		height: 100%;
		width: 100%;
	}
	:global(.css-renderer){
		pointer-events:none;
	}
	`

	const updateCanvasSize = () => {
		const rect = renderer.domElement.getBoundingClientRect()
		renderer.setSize(rect.width, rect.height, false)
		cssRenderer.setSize(rect.width, rect.height)
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

	return (
		<>
			{renderer.domElement}
			{cssRenderer.domElement}
		</>
	)
}