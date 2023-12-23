import { TextureLoader } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export type stringCaster<K extends string> = (s: string) => K
export const getFileName = <K extends string>(path: string) => {
	return	path.split(/[./]/g).at(-2) ?? '' as K
}
export const getFolderName = (path: string) => {
	return	path.split(/[./]/g).at(-3) ?? ''
}

const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)
export const textureLoader = new TextureLoader()
export const loadGLB = (path: string) => loader.loadAsync(path)
export const loadImage = (path: string) => new Promise<HTMLImageElement>((resolve) => {
	const img = new Image()
	img.src = path
	img.onload = () => resolve(img)
})