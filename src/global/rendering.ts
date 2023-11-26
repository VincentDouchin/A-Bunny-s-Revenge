import { BasicShadowMap, CustomBlending, OneMinusDstAlphaFactor, Scene, ShaderMaterial, Uniform, Vector2, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { camera } from './camera'
import { ecs } from './init'
import { SobelOperatorShader } from '@/shaders/sobel'

export const scene = new Scene()
export const renderer = new WebGLRenderer()
export const composer = new EffectComposer(renderer)

// Create a ShaderPass with the custom shader
export const initThree = (pixelation = 1) => () => {
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = BasicShadowMap
	document.body.appendChild(renderer.domElement)
	renderer.setSize(window.innerWidth / pixelation, window.innerHeight / pixelation)
	const renderPass = new RenderPass(scene, camera)
	composer.addPass(renderPass)

	const sobel = new ShaderMaterial(SobelOperatorShader)

	sobel.uniforms.resolution = new Uniform(new Vector2(window.innerWidth * 2, window.innerHeight * 2))
	const sobelPass = new ShaderPass(sobel)

	// composer.addPass(sobelPass)

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