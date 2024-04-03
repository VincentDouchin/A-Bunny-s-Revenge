import type { Texture, WebGLRenderTarget } from 'three'
import { Color, Uniform, Vector2 } from 'three'
import kuwahara from '@/shaders/glsl/lib/kuwahara.glsl?raw'
import sobel from '@/shaders/glsl/lib/sobel.glsl?raw'

export const getDepthShader = (target: WebGLRenderTarget) => ({
	uniforms: {
		tDepth: new Uniform<Texture>(target.depthTexture),
		cameraNear: { value: 0.1 },
		cameraFar: { value: 100 },
		orthographic: { value: true },
	},
	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
	fragmentShader: /* glsl */`
		precision highp sampler2D;
		uniform sampler2D tDepth;
		uniform sampler2D tDiffuse;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform bool orthographic;
		uniform vec2 resolution;
		varying vec2 vUv;

		#include <packing>
        float readDepth( sampler2D depthSampler, vec2 coord ) {
            float fragCoordZ = texture2D( depthSampler, coord ).x;
            float viewZ = orthographic 
            	? orthographicDepthToViewZ( fragCoordZ, cameraNear, cameraFar )
				: perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
            return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
        }

		void main() {
			float depth = readDepth( tDepth, vUv );
        	gl_FragColor.rgb = 1.0 - vec3( depth );
			gl_FragColor.a = 1.0;

		}`,
})

export const getSobelShader = (x: number, y: number, diffuseTarget: WebGLRenderTarget, depthTarget: WebGLRenderTarget) => ({

	name: 'SobelOperatorShader',

	uniforms: {

		tDiffuse: new Uniform<Texture>(diffuseTarget.texture),
		tDepth: new Uniform<Texture>(depthTarget.texture),
		resolution: new Uniform(new Vector2(x, y).multiplyScalar(2)),
		edgeColor: new Uniform(new Color(0x4D3533)),
		pixelSize: new Uniform(1),
	},

	vertexShader: /* glsl */`

		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

	fragmentShader: /* glsl */`
		precision highp sampler2D;
		uniform sampler2D tDepth;
		uniform sampler2D tDiffuse;
		uniform vec3 edgeColor;
		uniform vec2 resolution;
		varying vec2 vUv;
		uniform float pixelSize;
		${kuwahara}
		${sobel}
		#include <packing>
		void main() {
			vec2 d = pixelSize / resolution;
			// vec2 uv = d * (floor(vUv * 1./ d ) + 0.5);
			vec2 uv = vUv;
			float G = sobel(tDepth,uv,resolution);	
			float Gfactor = clamp(step(G * 5.0,0.1)+0.8,0.0,1.0);
			vec3 color = texture2D(tDiffuse,uv).rgb;
			// vec4 k =  kuwahara(tDiffuse, resolution, uv, 3);
			float dark = step(0.4,(color.r+color.g+color.b) /3.);
			// gl_FragColor = k; 
			gl_FragColor = vec4(mix(edgeColor,color,Gfactor),1.); 


		}`,

})
