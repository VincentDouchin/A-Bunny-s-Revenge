import type { AssetData, EditorTags, LevelData } from '../types'
import { path } from '@tauri-apps/api'
import { BaseDirectory, copyFile, exists, mkdir, readDir, readFile, readTextFile, remove, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { Formatter } from 'fracturedjsonjs'
import { loadImage } from '@/global/assetLoaders'

const format = (data: any) => {
	const formatter = new Formatter()
	formatter.Options.MaxPropNamePadding = 0
	const txt = JSON.stringify(data)
	return formatter.Reformat(txt)
}
export const FOLDER = 'A-Bunny-s-Revenge'

const copyFileLocal = async (filePath: string[], localDir: string | null) => {
	if (localDir) {
		await copyFile(
			await path.join(FOLDER, ...filePath),
			await path.join(localDir, ...filePath),
			{ fromPathBaseDir: BaseDirectory.AppData },
		)
	}
}

export const createLevelFolder = async (level: string, localDir: string | null) => {
	const pathAppData = await path.join(FOLDER, 'assets', 'levels', level)
	if (!(await exists(pathAppData, { baseDir: BaseDirectory.AppData }))) {
		await mkdir(pathAppData, { baseDir: BaseDirectory.AppData })
	}
	if (localDir) {
		const pathLocal = await path.join(localDir, 'assets', 'levels', level)
		if (!(await exists(pathLocal))) {
			await mkdir(pathLocal)
		}
	}
}

const saveTextFile = async (filePath: string[], data: any, localDir: string | null) => {
	const fileContent = filePath.at(-1)?.endsWith('.json') ? format(data) : data
	await writeTextFile(await path.join(FOLDER, ...filePath), fileContent, { baseDir: BaseDirectory.AppData })
	await copyFileLocal(filePath, localDir)
}

export const saveLevelImage = async (level: string, name: string, canvas: HTMLCanvasElement, localDir: string | null) => {
	const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
	if (!blob) return
	const arrayBuffer = await blob.arrayBuffer()
	const bytes = new Uint8Array(arrayBuffer)
	const filePath = ['assets', 'levels', level, `${name}.png`]
	await writeFile(await path.join(FOLDER, ...filePath), bytes, { baseDir: BaseDirectory.AppData })
	await copyFileLocal(filePath, localDir)
}

// Bounding box
export const createFolder = async () => {
	const folderExists = await exists(FOLDER, { baseDir: BaseDirectory.AppData })
	if (!folderExists) {
		await mkdir(FOLDER, { baseDir: BaseDirectory.AppData, recursive: true })
	}
}

export const isRepoCloned = async () => {
	const contents = await readDir(FOLDER, { baseDir: BaseDirectory.AppData })
	return contents.length !== 0
}

const getBoundingBoxPath = (folder: string) => path.join(folder, 'assets', 'boundingBox.json')

export const loadBoundingBox = async (): Promise<Record<string, Record<string, AssetData>>> => {
	const filePath = await getBoundingBoxPath(FOLDER)
	const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData })
	if (fileExists) {
		const contents = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
		return JSON.parse(contents) as Record<string, Record<string, AssetData>>
	} else {
		await writeTextFile(filePath, JSON.stringify({}), { baseDir: BaseDirectory.AppData })
		return {}
	}
}

export const saveBoundingBox = async (boundingBox: Record<string, Record<string, AssetData>>, localDir: string | null) => {
	await saveTextFile(['assets', 'boundingBox.json'], boundingBox, localDir)
}

// Tags
const getTagsListPath = (ext: 'json' | 'ts') => ['assets', `tagsList.${ext}`]
const saveTagsListTypes = async (tags: EditorTags, localDir: string | null) => {
	const tagsTypes = Object.entries(tags).reduce((acc, [key, val]) => {
		if (val.type === 'tag') {
			acc += `
	${key}: true`
		} else if (val.type === 'enum') {
			acc += `
	${key}: ${val.values.map(t => `'${t}'`).join('|')}`
		} else if (val.type === 'number') {
			acc += `
	${key}: number`
		} else if (val.type === 'string') {
			acc += `
	${key}: string`
		}
		return acc
	}, '')
	const fileContent = `export type Tags = {${tagsTypes}
}`
	const filePath = getTagsListPath('ts')
	await saveTextFile(filePath, fileContent, localDir)
}
export const loadTagsList = async () => {
	const getFilePath = getTagsListPath('json')
	const filePath = await path.join(FOLDER, ...getFilePath)
	const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData })
	if (fileExists) {
		const contents = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
		return JSON.parse(contents) as EditorTags
	} else {
		await writeTextFile(filePath, JSON.stringify({ }), { baseDir: BaseDirectory.AppData })
		return { } as EditorTags
	}
}
export const saveTagsList = async (tags: EditorTags, localDir: string | null) => {
	await saveTagsListTypes(tags, localDir)
	const filePath = getTagsListPath('json')
	await saveTextFile(filePath, tags, localDir)
}

// Levels
const getLevelsDirPath = (folder: string) => path.join(folder, 'assets', 'levels')

export const loadLevels = async () => {
	return readDir(await getLevelsDirPath(FOLDER), { baseDir: BaseDirectory.AppData })
}
export const saveLevelFile = async (levelName: string, level: LevelData, localDir: string | null) => {
	const filePath = ['assets', 'levels', levelName, 'data.json']
	await saveTextFile(filePath, level, localDir)
}
export const removeLevel = async (levelName: string) => {
	const levelPath = await path.join(await getLevelsDirPath(FOLDER), `${levelName}.json`)
	remove(levelPath, { baseDir: BaseDirectory.AppData })
}

export const loadImageFile = async (level: string, name: string) => {
	const bytes = await readFile(await path.join(FOLDER, 'assets', 'levels', level, `${name}.png`), { baseDir: BaseDirectory.AppData }).catch(() => null)
	if (bytes) {
		const blob = new Blob([bytes], { type: 'image/png' })
		const url = URL.createObjectURL(blob)
		const img = await loadImage(url)
		return img
	} else {
		return null
	}
}

export const loadLevel = async (level: string) => {
	const levelDir = ['assets', 'levels', level]
	const fileContent = await readTextFile(await path.join(FOLDER, ...levelDir, 'data.json'), { baseDir: BaseDirectory.AppData })
	const dataParsed = JSON.parse(fileContent) as LevelData
	return dataParsed
}

export const deleteFile = async (level: string, file: string, localDir: string | null) => {
	const filePath = ['assets', 'levels', level, file]
	await remove(await path.join(FOLDER, ...filePath)).catch(() => {
		console.warn(`file ${file} for level ${level} does not exist`)
	})
	if (localDir) {
		await remove(await path.join(localDir, ...filePath)).catch(() => {
			console.warn(`file ${file} for level ${level} does not exist in ${localDir}`)
		})
	}
}