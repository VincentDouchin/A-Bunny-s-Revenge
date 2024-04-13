import { Color, SpriteMaterial } from 'three'
import { MaterialExtension, addUniform, extendMaterial, removeInclude, replace, unpack } from '@/lib/materialExtension'

const dashExtension = new MaterialExtension({
	angle: 0,
	display: 0,
	color1: new Color(0x6DEAD6),
	color2: new Color(0x36C5F4),
})
	.defines('USE_UV')
	.frag(
		addUniform('angle', 'float'),
		addUniform('display', 'float'),
		addUniform('color1', 'vec3'),
		addUniform('color2', 'vec3'),
		unpack('colorspace_fragment'),
		removeInclude('fog_fragment'),
		replace('gl_FragColor = linearToOutputTexel( gl_FragColor );', /* glsl */`
			vec2 centered_uv = vUv *2.-1.;
			vec3 color = mix(color1,color2,display-0.2);
			float angled_color = centered_uv.x >=0.
				? atan(centered_uv.x,centered_uv.y)
				: PI - atan(centered_uv.x,-centered_uv.y);
			float circle = step(length(centered_uv),1.) - step(length(centered_uv),0.4);
			float progress = angle*2. - angled_color/PI/2.;
			float opacity = display/0.5 > 1.
				? (1. - display)*circle
				: circle*progress;
			gl_FragColor = vec4(color,opacity);
	`),
	)

export const DashMaterial = extendMaterial(SpriteMaterial, [dashExtension])