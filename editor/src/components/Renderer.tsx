import type { Atom } from 'solid-use/atom'
import type { PerspectiveCamera, Vec2, WebGLRenderer } from 'three'
import { createScheduled, debounce } from '@solid-primitives/scheduled'
import { onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'

export function Renderer({ camera, renderer, mousePosition, onPointerDown }: {
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	mousePosition: Atom<Vec2 | null>
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
	const getMousePosition = (e: PointerEvent) => {
		const box = renderer.domElement.getBoundingClientRect()
		return {
			x: ((e.clientX - box.left) / (box.right - box.left)) * 2 - 1,
			y: -((e.clientY - box.top) / (box.bottom - box.top)) * 2 + 1,
		}
	}

	onMount(updateCanvasSize)
	const scheduled = createScheduled(fn => debounce(fn, 1))
	renderer.domElement.addEventListener('pointermove', (e) => {
		if (scheduled()) {
			mousePosition(getMousePosition(e))
		}
	})
	renderer.domElement.addEventListener('pointerleave', () => {
		mousePosition(null)
	})
	renderer.domElement.addEventListener('pointerdown', onPointerDown)
	onCleanup(() => {
		renderer.setAnimationLoop(null)
	})

	return <>{renderer.domElement}</>
}