import { addUniform, addVarying, extendMaterial, importLib, insertAfter, insertBefore, MaterialExtension, override, remove, replace, replaceInclude, unpack } from '@/lib/materialExtension'
import noise from '@/shaders/glsl/lib/cnoise.glsl?raw'
import { gradient } from '@/shaders/glsl/lib/generateGradient'
import water from '@/shaders/glsl/water.glsl?raw'
import { useLocalStorage } from '@/utils/useLocalStorage'
import { Color, MeshPhongMaterial, Vector2, Vector3 } from 'three'

const toonExtension = new MaterialExtension({}).frag(
	override('vec4 diffuseColor ', 'vec4(1.,1.,1.,opacity)'),
	importLib(gradient),
	replaceInclude('map_fragment', ''),
	unpack('lights_phong_pars_fragment'),
	replace('vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = floor(dotNL * directLight.color * 3.)/3.;\n'),
	replaceInclude('opaque_fragment', /* glsl */`
	vec4 color = vec4(1.,1.,1.,opacity);
	#ifdef USE_MAP
		vec4 sampledDiffuseColor = texture2D( map, vMapUv );
		color *= sampledDiffuseColor;
	#else
		color.rgb *= diffuse;
	#endif
	color.rgb *= outgoingLight;
	float max_light = max(outgoingLight.z,max(outgoingLight.x,outgoingLight.y)) * 12.;
	vec3 outgoingLight2 = colorRamp(color.xyz, max_light);
	gl_FragColor = vec4(outgoingLight2,color.a);`),
)
const [groundColors] = useLocalStorage('groundColor', {
	topColor: '#5AB552',
	pathColor: '#856342',
	pathColor2: '#A26D3F',
	grassColor: '#26854C',
})
const vineGateMaterial = new MaterialExtension({ time: 0 })
	.frag(
		addVarying('worldPos', 'vec4'),
		addUniform('time', 'float'),
		insertBefore('gl_FragColor = vec4(outgoingLight2,color.a);',
			/* glsl */`
	float op = (worldPos.y+ 40. * time )/30.;
	color.a = min(color.a, (1. - op) );
`),
	)
	.vert(
		addVarying('worldPos', 'vec4'),
		insertAfter('#include <worldpos_vertex>', /* glsl */`
	worldPos = vec4( transformed, 1.0 );
	`),
	)
const groundExtension = new MaterialExtension({
	level: null,
	size: null,
	topColor: new Color(groundColors.topColor),
	pathColor: new Color(groundColors.pathColor),
	pathColor2: new Color(groundColors.pathColor2),
	grassColor: new Color(groundColors.grassColor),
	rock: null,
	rock_texture: null,
	ground: null,
})
	.defines('USE_UV')
	.defines('USE_ENVMAP')
	.frag(
		importLib(noise),
		addUniform('size', 'vec2'),
		addUniform('level', 'sampler2D'),
		addUniform(`pathColor2`, 'vec3'),
		addUniform(`pathColor`, 'vec3'),
		addUniform(`topColor`, 'vec3'),
		addUniform(`grassColor`, 'vec3'),
		addUniform(`ground`, 'sampler2D'),
		addUniform(`rock_texture`, 'sampler2D'),
		addUniform(`rock`, 'sampler2D'),
		remove('color.rgb *= diffuse;'),
		replace('vec4 color = vec4(1.,1.,1.,opacity);', /* glsl */`
			vec4 color = vec4(1.);
			vec2 scaled_uv = vUv*size/10.;
			float noise = cnoise(scaled_uv.xyx);
			float noise2 = cnoise((scaled_uv/2.).yxy);
			bool is_path = texture2D(level,vUv ).r == 1.0;
			vec3 path = step(cnoise(scaled_uv.yyy)+cnoise(scaled_uv.xyy)/2.,0.2) ==0.
					? pathColor
					: mix(pathColor,pathColor2,0.1) ;
			vec3 grass = step(0.4,noise2) == 1.
				? mix(grassColor,topColor,0.3)
				: step(0.3,noise) == 1.
					? mix(grassColor,topColor,0.2)
					: grassColor;

			vec3 normal2 = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
			float slope = dot(normal2, vec3(0.,1.,0.));
			vec3 blending = abs( worldNormal );
			float b = (blending.x + blending.y + blending.z);
			blending /= vec3(b, b, b);
			vec4 xaxis = texture2D( ground, vWorldPosition.yz / 64.);
			vec4 zaxis = texture2D( ground, vWorldPosition.xy / 64.);
			vec4 tex = xaxis * blending.x + zaxis * blending.z;
			float dotNormal = 1. - smoothstep(0.7,1.,0.3+dot(worldNormal, vec3(0.,1,0.)));
			float world_noise = cnoise(vWorldPosition*300.);
			float normal_noised = step(dotNormal ,dotNormal * world_noise);
			float noise_3 = step(0.5,cnoise(vec3(dotNormal)));
			float path_amount = texture2D(level,vUv ).a;
			float path_noised = step(0.5- path_amount ,cnoise(vec3(scaled_uv,1.))*(path_amount/3.));
			vec3 grass_and_path = mix(grass,path,path_noised );
			vec4 rock_sampled = texture2D(rock_texture,vUv * size/ 32.);
			vec3 rock_mixed = mix(grass_and_path, rock_sampled.rgb, rock_sampled.a);
			float rock_amount = step(0.2,texture2D(rock,vUv).a);
			vec3 grass_and_path_and_rock = mix(grass_and_path,rock_mixed,rock_amount);
			color.rgb = mix(tex.rgb,grass_and_path_and_rock,normal_noised);
	`),
	)

export const treeExtension = new MaterialExtension({ playerZ: 0 })

	.frag(
		addUniform('playerZ', 'float'),
		replace('gl_FragColor = vec4(outgoingLight2,color.a);', /* glsl */`
	vec2 view = vViewPosition.xy ;
	float new_opacity = playerZ == 1. ? smoothstep(15.,25.,abs(length(view))) : opacity;
	gl_FragColor = vec4(outgoingLight2, new_opacity);
	`),
	)

export const vegetationExtension = new MaterialExtension({ pos: new Vector2(), time: 0, height: 1, shake: 0 })

	.vert(
		addUniform('time', 'float'),
		addUniform('height', 'float'),
		addUniform('shake', 'float'),
		importLib(noise),
		addUniform('pos', 'vec2'),
		unpack('project_vertex'),
		insertAfter('vec4 mvPosition = vec4( transformed, 1.0 );', /* glsl */`
		float noise = cnoise(vec3(pos.xy,time+shake));
		float height_factor = mvPosition.y / height;
		float shakeX = (shake > 0.) ? sin(shake) * 3. : 0.;
		float shakeY = (shake > 0.) ? cos(shake) * 3. : 0.;
		vec4 displacement = vec4(
			(sin(noise)+shakeX)*height_factor,
			0.,
			(cos(noise)+shakeY)*height_factor,
			0.
		);
		mvPosition = mvPosition + displacement;
		`),
	)

const characterExtension = new MaterialExtension({ flash: 0, flashColor: new Vector3(1, 1, 1) })
	.frag(
		addUniform('flash', 'float'),
		addUniform('flashColor', 'vec3'),
		override('gl_FragColor', /* glsl */`
			vec4(mix(outgoingLight2.rgb,flashColor,flash/2. ), opacity);
	`),
	)
export const waterExtension = new MaterialExtension({
	size: null,
	water_color: new Color(0x36C5F4),
	foam_color: new Color(0xCFF5F6),
	time: 0,
})
	.defines('USE_UV')
	.frag(
		addUniform('time', 'float'),
		importLib(water),
		addUniform('water_color', 'vec3'),
		addUniform('foam_color', 'vec3'),
		addUniform('size', 'vec2'),
		replace('gl_FragColor = vec4(outgoingLight2,color.a);', /* glsl */`
			if (sampledDiffuseColor.r == 0.){
				discard;
			}
			vec3 water_color = water(vUv*size/8., vec3(0,1,0),time,water_color,water_color - vec3(0.1) ,foam_color) * outgoingLight;
			gl_FragColor = vec4(water_color,1.);
		`),

	)

export const gardenPlotExtention = new MaterialExtension({
	water: 0,
})
	.defines('USE_UV')
	.frag(
		addUniform('water', 'float'),
		importLib(noise),
		replace('gl_FragColor = vec4(outgoingLight2,color.a);', /* glsl */`
		vec3 watered_color =  mix( outgoingLight2, outgoingLight2 * 0.5,water); 
		gl_FragColor = vec4(watered_color, opacity);
	`),
	)
export const ToonMaterial = extendMaterial(MeshPhongMaterial, [toonExtension])
export const VineGateMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, vineGateMaterial])
export const CharacterMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, characterExtension])
export const GroundMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, groundExtension])
export const WaterMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, waterExtension])
export const TreeMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, treeExtension, vegetationExtension])
export const GrassMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, vegetationExtension])
export const GardenPlotMaterial = extendMaterial(MeshPhongMaterial, [toonExtension, gardenPlotExtention])