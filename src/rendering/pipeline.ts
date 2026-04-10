import { setupPostProcessing } from '@/shaders/EdgePass'
import { RenderGroup } from '@/global/entity'
import { ecs, renderer } from '@/global/init'
import { CSS2DRenderer } from 'three/addons'
import { DepthTexture, Group, NodeMaterial, QuadMesh, RenderTarget, Scene } from 'three/webgpu'

const w = window.innerWidth
const h = window.innerHeight

export const initRenderPipeline = () => {
	const cssRenderer = new CSS2DRenderer()
	const sceneTarget = new RenderTarget(w, h, { depthBuffer: true })
	sceneTarget.depthTexture = new DepthTexture(w, h)

	const outline = new RenderTarget(w, h, { depthBuffer: true })
	outline.depthTexture = new DepthTexture(w, h)

	const outlineComposite = new RenderTarget(w, h)
	const final = new RenderTarget(w, h)

	const { postProcessing, uniforms, outlineNode } = setupPostProcessing(renderer, w, h, sceneTarget, outline, outlineComposite)

	const outlineMaterial = new NodeMaterial()
	outlineMaterial.colorNode = outlineNode
	const outlineQuad = new QuadMesh(outlineMaterial)

	cssRenderer.setSize(w, h)
	cssRenderer.domElement.classList.add('main', 'css-renderer')
	document.body.appendChild(cssRenderer.domElement)

	ecs.add({
		scene: new Scene(),
		renderer,
		cssRenderer,
		renderGroup: RenderGroup.Game,
		renderPipeline: { targets: { scene: sceneTarget, outline, outlineComposite, final }, uniforms, postProcessing, outlineQuad },
		group: new Group(),
	})
}

export const renderPipelineQuery = ecs.with('renderPipeline', 'scene', 'cssRenderer')
