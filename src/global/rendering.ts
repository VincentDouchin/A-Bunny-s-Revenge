import { BasicShadowMap, LinearSRGBColorSpace, Scene, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { camera } from './camera'
import { ecs } from './init'
import { VignetteShader } from '@/shaders/VignetteShader'

export const scene = new Scene()
export const renderer = new WebGLRenderer({ alpha: true })
export const composer = new EffectComposer(renderer)

export const initThree = (pixelation = 1) => () => {
	renderer.clear()
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = BasicShadowMap
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = LinearSRGBColorSpace
	renderer.setSize(window.innerWidth / pixelation, window.innerHeight / pixelation)
	composer.setSize(window.innerWidth / pixelation, window.innerHeight / pixelation)

	composer.addPass(new RenderPass(scene, camera))

	composer.addPass(new ShaderPass(VignetteShader()))

	ecs.add({ scene })
}
export const rendererQuery = ecs.with('renderer')
export const sceneQuery = ecs.with('scene')
export const cameraQuery = ecs.with('camera')
export const render = () => {
	composer.render()
}

const controlsQuery = ecs.with('controls')
export const updateControls = () => {
	for (const { controls } of controlsQuery) {
		controls.update()
	}
}