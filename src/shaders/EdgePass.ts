import type { Shader, Texture, WebGLRenderTarget } from 'three'
import { Uniform, Vector2 } from 'three'

export const getDepthShader = (target: WebGLRenderTarget): Shader => ({
	uniforms: {
		tDepth: new Uniform<Texture>(target.depthTexture),
		cameraNear: { value: 0.1 },
		cameraFar: { value: 100 },
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
		uniform vec2 resolution;
		varying vec2 vUv;

		#include <packing>
        float readDepth( sampler2D depthSampler, vec2 coord ) {
            float fragCoordZ = texture2D( depthSampler, coord ).x;
            float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
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
		resolution: { value: new Vector2(x, y).multiplyScalar(2) },

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
		uniform vec2 resolution;
		varying vec2 vUv;

		#include <packing>
		void main() {

			vec2 texel = vec2( 1.0 / resolution.x, 1.0 / resolution.y );

		// kernel definition (in glsl matrices are filled in column-major order)

			const mat3 Gx = mat3(
			-1, -2, -1,
			0, 0, 0,
			1, 2, 1 ); // x direction kernel
			const mat3 Gy = mat3(
			-1, 0, 1,
			-2, 0, 2,
			-1, 0, 1 ); // y direction kernel

		// fetch the 3x3 neighbourhood of a fragment

		// first column

			float tx0y0 = texture2D( tDepth, vUv + texel * vec2( -1, -1 ) ).r;
			float tx0y1 = texture2D( tDepth, vUv + texel * vec2( -1,  0 ) ).r;
			float tx0y2 = texture2D( tDepth, vUv + texel * vec2( -1,  1 ) ).r;

		// second column

			float tx1y0 = texture2D( tDepth, vUv + texel * vec2(  0, -1 ) ).r;
			float tx1y1 = texture2D( tDepth, vUv + texel * vec2(  0,  0 ) ).r;
			float tx1y2 = texture2D( tDepth, vUv + texel * vec2(  0,  1 ) ).r;

		// third column

			float tx2y0 = texture2D( tDepth, vUv + texel * vec2(  1, -1 ) ).r;
			float tx2y1 = texture2D( tDepth, vUv + texel * vec2(  1,  0 ) ).r;
			float tx2y2 = texture2D( tDepth, vUv + texel * vec2(  1,  1 ) ).r;

		// gradient value in x direction

			float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
				Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
				Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

		// gradient value in y direction

			float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
				Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
				Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;
		// magnitute of the total gradient

			float G = sqrt(( valueGx * valueGx ) + ( valueGy * valueGy )) ;
			gl_FragColor.rgb =  vec3(clamp(step(G * 5.0,0.15)+0.7,0.0,1.0) ) * texture2D(tDiffuse,vUv).rgb;
			gl_FragColor.a = 1.0;

		}`,

})
