import type { ColorRepresentation, Shader, Vec2, WebGLRenderer } from 'three'
import { Color, MeshToonMaterial, Uniform } from 'three'
import cnoise from '@/shaders/glsl/lib/cnoise.glsl?raw'

export class PlanterMaterial extends MeshToonMaterial {
	shader?: Shader
	constructor(public args: { size: Vec2, color: ColorRepresentation }) {
		super({ color: args.color })
	}

	onBeforeCompile(shader: Shader, _renderer: WebGLRenderer): void {
		shader.uniforms.colorAdd = new Uniform(new Color(0, 0, 0))
		shader.uniforms.size = new Uniform(this.args.size)
		this.shader = shader
		shader.vertexShader = /* glsl */`
		#define USE_UV
		${shader.vertexShader}
		`
		shader.fragmentShader = /* glsl */`
		#define TOON
		#define USE_UV
		uniform vec3 colorAdd;
		uniform vec3 diffuse;
		uniform vec3 emissive;
		uniform float opacity;

		#include <common>
		#include <packing>
		#include <dithering_pars_fragment>
		#include <color_pars_fragment>
		#include <uv_pars_fragment>
		#include <map_pars_fragment>
		#include <alphamap_pars_fragment>
		#include <alphatest_pars_fragment>
		#include <alphahash_pars_fragment>
		#include <aomap_pars_fragment>
		#include <lightmap_pars_fragment>
		#include <emissivemap_pars_fragment>
		#include <gradientmap_pars_fragment>
		#include <fog_pars_fragment>
		#include <bsdfs>
		#include <lights_pars_begin>
		#include <normal_pars_fragment>
		#include <lights_toon_pars_fragment>
		#include <shadowmap_pars_fragment>
		#include <bumpmap_pars_fragment>
		#include <normalmap_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>
		${cnoise}
		uniform vec2 size;
		void main() {

			#include <clipping_planes_fragment>

			vec4 diffuseColor = vec4( diffuse, opacity );
			ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
			vec3 totalEmissiveRadiance = emissive;

			#include <logdepthbuf_fragment>
			#include <map_fragment>
			#include <color_fragment>
			#include <alphamap_fragment>
			#include <alphatest_fragment>
			#include <alphahash_fragment>
			#include <normal_fragment_begin>
			#include <normal_fragment_maps>
			#include <emissivemap_fragment>

			// accumulation
			#include <lights_toon_fragment>
			#include <lights_fragment_begin>
			#include <lights_fragment_maps>
			#include <lights_fragment_end>

			// modulation
			#include <aomap_fragment>
			vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;

			#ifdef OPAQUE
			diffuseColor.a = 1.0;
			#endif

			#ifdef USE_TRANSMISSION
			diffuseColor.a *= material.transmissionAlpha;
			#endif
			vec2 sizedUv = (1. -abs(vUv * 2. - 1.)) * size;
			float noise = cnoise(vec3(vUv*size*0.2,1));
			float borders = noise * max(smoothstep(0.,3.,sizedUv.x) * smoothstep(0.,3.,sizedUv.y) + 0.3,1.);
			gl_FragColor = vec4( outgoingLight * (borders * 2.) , diffuseColor.a );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>
			#include <dithering_fragment>

		}

		`
	}
}