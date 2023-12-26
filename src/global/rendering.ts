import { BasicShadowMap, LinearSRGBColorSpace, Scene, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { camera } from './camera'
import { ecs } from './init'
import { params } from './context'
import { VignetteShader } from '@/shaders/VignetteShader'

export const scene = new Scene()
export const renderer = new WebGLRenderer({ alpha: true })
export const composer = new EffectComposer(renderer)
export const cssRenderer = new CSS2DRenderer()

export const initThree = () => {
	renderer.clear()
	const ratio = window.innerHeight / window.innerWidth
	const width = params.renderWidth
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = BasicShadowMap
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = LinearSRGBColorSpace
	renderer.setSize(width, width * ratio)
	composer.setSize(width, width * ratio)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
	cssRenderer.domElement.style.position = 'fixed'
	cssRenderer.domElement.style.left = '0'
	cssRenderer.domElement.style.top = '0'
	cssRenderer.domElement.style.imageRendering = 'pixelated'
	cssRenderer.domElement.style.pointerEvents = 'none'
	document.body.appendChild(cssRenderer.domElement)
	composer.addPass(new RenderPass(scene, camera))

	composer.addPass(new ShaderPass(VignetteShader()))

	ecs.add({ scene })
}
export const rendererQuery = ecs.with('renderer')
export const sceneQuery = ecs.with('scene')
export const cameraQuery = ecs.with('camera')
export const render = () => {
	composer.render()
	cssRenderer.render(scene, camera)
}

const controlsQuery = ecs.with('controls')
export const updateControls = () => {
	for (const { controls } of controlsQuery) {
		controls.update()
	}
}