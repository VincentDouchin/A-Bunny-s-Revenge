import type { Shader, WebGLRenderer } from 'three'
import { Color, MeshToonMaterial, Uniform } from 'three'

export class CustomToonMaterial extends MeshToonMaterial {
	shader?: Shader
	onBeforeCompile(shader: Shader, _renderer: WebGLRenderer): void {
		shader.uniforms.colorAdd = new Uniform(new Color(0, 0, 0))
		this.shader = shader
		shader.fragmentShader = /* glsl */`
		#define TOON
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
			// diffuseColor.a = 1.0;
			#endif

			#ifdef USE_TRANSMISSION
			diffuseColor.a *= material.transmissionAlpha;
			#endif

			gl_FragColor = vec4( outgoingLight + colorAdd, diffuseColor.a );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>
			#include <dithering_fragment>

		}

		`
	}
}