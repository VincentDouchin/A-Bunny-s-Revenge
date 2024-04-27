import type { Material, WebGLProgramParametersWithUniforms } from 'three'
import { ShaderChunk, Uniform } from 'three'
import { generateUUID } from 'three/src/math/MathUtils'

type Constructor<T> = new (...args: any[]) => T

export const unpack = (part: keyof typeof ShaderChunk) => (shader: string) => {
	return shader.replace(`#include <${part}>`, ShaderChunk[part])
}
export const importLib = (part: string) => (shader: string) => {
	return shader.replace('void main() {', `${part}\nvoid main() {`)
}
export const insertBefore = (before: string, part: string) => (shader: string) => {
	return shader.replace(before, `${before}\n${part}`)
}
export const insertAfer = (after: string, part: string) => (shader: string) => {
	return shader.replace(after, `${part}\n${after}`)
}
export const replaceInclude = (include: string, part: string) => (shader: string) => {
	return shader.replace(`#include <${include}>`, part)
}
export const removeInclude = (include: string) => replaceInclude(include, '')
export const override = (variable: string, part: string) => (shader: string) => {
	return shader.split(`\n\t`).map(p => p.startsWith(variable) ? `${variable} = ${part};` : p).join(`\n\t`)
}
export const replace = (toReplace: string, part: string) => (shader: string) => {
	if (!shader.includes(toReplace)) console.error(`part to replace ${toReplace} not found in shader`)
	return shader.replace(toReplace, part)
}
export const addUniform = (name: string, type: 'vec2' | 'vec3' | 'vec4' | 'float' | 'int' | 'bool' | 'sampler2D') => (shader: string) => {
	return importLib(`uniform ${type} ${name};`)(shader)
}
export const remove = (toRemove: string) => (shader: string) => shader.replace(toRemove, '')
export class MaterialExtension {
	_defines: Record<string, any> = {}
	_vert: ((vertexShader: string) => string)[] = []
	_frag: ((fragmentShader: string) => string)[] = []
	key = generateUUID()
	timeUniform?: Uniform
	constructor(public uniforms: Record<string, any>) {

	}

	defines(key: string) {
		this._defines[key] = ''
		return this
	}

	vert(...fn: ((vertexShader: string) => string)[]) {
		this._vert.push(...fn)
		return this
	}

	frag(...fn: ((fragmentShader: string) => string)[]) {
		this._frag.push(...fn)
		return this
	}
}

export const extendMaterial = <M extends Constructor<Material>, E extends MaterialExtension[]>(Base: M, extensions: E, options?: { debug?: 'fragment' | 'vertex', unpack?: boolean, name?: string }) => {
	return class extends Base {
		uniforms = {} as any
		name = options?.name ?? ''
		customProgramCacheKey() {
			return Base.name + extensions.map(ext => ext.key).join('-')
		}

		setUniforms(uniforms: Record<string, any>) {
			for (const [name, value] of Object.entries(uniforms)) {
				this.uniforms[name] = new Uniform(value)
			}
			return this
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

		onBeforeCompile(shader: WebGLProgramParametersWithUniforms): void {
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
					shader.defines[define] = value
				}
			}

			if (options?.debug === 'fragment') {
				if (options.unpack) {
					shader.fragmentShader = shader.fragmentShader.replaceAll(/#include\s*<([^>]+)>/g, (_match, part) => {
						return ShaderChunk[part as keyof typeof ShaderChunk]
					})
				}
				// eslint-disable-next-line no-console
				console.log(shader.fragmentShader)
			}
			if (options?.debug === 'vertex') {
				if (options.unpack) {
					shader.vertexShader = shader.vertexShader.replaceAll(/#include\s*<([^>]+)>/g, (_match, part) => {
						return ShaderChunk[part as keyof typeof ShaderChunk]
					})
				}
				// eslint-disable-next-line no-console
				console.log(shader.vertexShader)
			}
		}
	}
}
