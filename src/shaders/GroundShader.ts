import type { Material, Shader } from 'three'
import { Color, MeshPhongMaterial, MeshStandardMaterial, Uniform, Vector2 } from 'three'

import { generateUUID } from 'three/src/math/MathUtils'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'

import { gradient } from '@/shaders/glsl/lib/generateGradient'

type Constructor<T> = new (...args: any[]) => T
export class MaterialExtension<U extends Record<string, any>> {
	_defines: Record<string, 1 | 0> = {}
	_vert: ((vertexShader: string) => string)[] = []
	_frag: ((fragmentShader: string) => string)[] = []
	key = generateUUID()
	constructor(public uniforms: U) {

	}

	defines(key: string) {
		this._defines[key] = 1
		return this
	}

	vert(...fn: ((vertexShader: string) => string)[]) {
		this._vert = fn
		return this
	}

	frag(...fn: ((fragmentShader: string) => string)[]) {
		this._frag = fn
		return this
	}
}

export const extendMaterial = <M extends Constructor<Material>, E extends MaterialExtension<any>[]>(Base: M, extensions: E, options?: { debug: boolean }) => {
	return class extends Base {
		uniforms = {} as any
		customProgramCacheKey() {
			return Base.name + extensions.map(ext => ext.key).join('-')
		}

		constructor(...args: any[]) {
			super(...args)
			for (const extension of extensions) {
				for (const [name, value] of Object.entries(extension.uniforms)) {
					const uniform = new Uniform(value);
					(<any> this.uniforms[name]) = uniform
				}
			}
		}

		onBeforeCompile(shader: Shader): void {
			// @ts-expect-error wrong type for shaders
			shader.defines ??= {}

			for (const extension of extensions) {
				for (const name of Object.keys(extension.uniforms)) {
					shader.uniforms[name] = this.uniforms[name]
				}
				for (const fn of extension._vert) {
					shader.vertexShader = fn(shader.vertexShader)
				}
				for (const fn of extension._frag) {
					shader.fragmentShader = fn(shader.fragmentShader)
				}
				for (const [define, value] of Object.entries(extension._defines)) {
					// @ts-expect-error wrong type for shader
					shader.defines[define] = value
				}
			}
			if (options?.debug) {
				// eslint-disable-next-line no-console
				console.log(shader.fragmentShader)
			}
		}
	}
}
export const importLib = (part: string) => (shader: string) => {
	return shader.replace('void main() {', `${part}\nvoid main() {`)
}
export const insertBefore = (before: string, part: string) => (shader: string) => {
	return shader.replace(before, `${before}\n${part}`)
}

export const replaceInclude = (include: string, part: string) => (shader: string) => {
	return shader.replace(`#include <${include}>`, part)
}
export const override = (variable: string, part: string) => (shader: string) => {
	return shader.split(`\n\t`).map(p => p.startsWith(variable) ? `${variable} = ${part};` : p).join(`\n\t`)
}
export const replace = (toReplace: string, part: string) => (shader: string) => {
	return shader.replace(toReplace, part)
}
export const addUniform = (name: string, type: 'vec2' | 'vec3' | 'vec4' | 'float' | 'int' | 'bool') => (shader: string) => {
	return importLib(`uniform ${type} ${name};`)(shader)
}
export const remove = (toRemove: string) => (shader: string) => shader.replace(toRemove, '')
const toonExtension = new MaterialExtension({ }).frag(
	override('vec4 diffuseColor ', 'vec4(1.)'),
	importLib(gradient),
	replaceInclude('map_fragment', ''),
	replaceInclude('opaque_fragment', /* glsl */`
	vec4 color = vec4(1.);
	#ifdef USE_MAP
		vec4 sampledDiffuseColor = texture2D( map, vMapUv );
		color *= sampledDiffuseColor;
	#endif
	color.rgb *= diffuse;
	float max_light = max(outgoingLight.z,max(outgoingLight.x,outgoingLight.y)) * 3.;
	vec3 outgoingLight2 = colorRamp(color.xyz, max_light);
	gl_FragColor = vec4(  outgoingLight2  , opacity);`),
)
const groundExtension = new MaterialExtension({ topColor: new Color(0x5AB552) }).defines('USE_UV').frag(
	importLib(noise),
	importLib(`uniform vec3 topColor;`),
	remove('color.rgb *= diffuse;'),
	replace('vec4 color = vec4(1.);', /* glsl */`
	vec4 color = vec4(1.);
	float noise = cnoise(vUv.xyx*25.);
	float noise2 = cnoise(vUv.yxy * 15.);
	color.rgb =
		step(0.4,noise2) == 1. 
		? mix(diffuse,topColor,0.3)
		: step(0.3,noise) == 1. 
			? mix(diffuse,topColor,0.2) 
			: diffuse ;
	`),
)

const treeExtension = new MaterialExtension({ playerZ: 0, resolution: new Vector2(1, 1) }).frag(
	addUniform('playerZ', 'float'),
	addUniform('resolution', 'vec2'),
	replace('gl_FragColor = vec4(  outgoingLight2  , opacity);', /* glsl */`
	vec2 view = vViewPosition.xy ;
	float new_opacity = playerZ == 1. ? smoothstep(15.,25.,abs(length(view))) : opacity;
	gl_FragColor = vec4(  outgoingLight2  , new_opacity);
	`),
)
export const ToonMaterial = extendMaterial(MeshStandardMaterial, [toonExtension])
export const GroundMaterial = extendMaterial(MeshStandardMaterial, [toonExtension, groundExtension])
export const TreeMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, treeExtension])
