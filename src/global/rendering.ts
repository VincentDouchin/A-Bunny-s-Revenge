import { BasicShadowMap, SRGBColorSpace, Scene, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { camera } from './camera'
import { ecs } from './init'

export const scene = new Scene()
export const renderer = new WebGLRenderer()
export const composer = new EffectComposer(renderer)

export const initThree = (pixelation = 1) => () => {
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = BasicShadowMap
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = SRGBColorSpace
	renderer.setSize(window.innerWidth / pixelation, window.innerHeight / pixelation)
	const renderPass = new RenderPass(scene, camera)
	composer.addPass(renderPass)

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