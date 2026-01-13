import type { Tags } from '@assets/tagsList'
import type { AssetData, EditorTags, LevelData } from '../types'
import { path } from '@tauri-apps/api'
import { BaseDirectory, exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs'
import { Formatter } from 'fracturedjsonjs'
import { get } from 'idb-keyval'

const format = (data: any) => {
	const formatter = new Formatter()
	formatter.Options.MaxPropNamePadding = 0
	const txt = formatter.Serialize(data)!
	return formatter.Reformat(txt)
}
// Bounding box
export const createFolder = async (folder: string) => {
	const folderExists = await exists(folder, { baseDir: BaseDirectory.AppData })
	if (!folderExists) {
		await mkdir(folder, { baseDir: BaseDirectory.AppData, recursive: true })
	}
}

export const isRepoCloned = async (folder: string) => {
	const contents = await readDir(folder, { baseDir: BaseDirectory.AppData })
	return contents.length !== 0
}

const getBoundingBoxPath = (folder: string) => path.join(folder, 'assets', 'boundingBox.json')

export const loadBoundingBox = async (folder: string): Promise<Record<string, Record<string, AssetData>>> => {
	const filePath = await getBoundingBoxPath(folder)
	const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData })
	if (fileExists) {
		const contents = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
		return JSON.parse(contents) as Record<string, Record<string, AssetData>>
	} else {
		await writeTextFile(filePath, JSON.stringify({}), { baseDir: BaseDirectory.AppData })
		return {}
	}
}

export const saveBoundingBox = async (folder: string, boundingBox: Record<string, Record<string, AssetData>>) => {
	const filePath = await getBoundingBoxPath(folder)
	await writeTextFile(filePath, format(boundingBox), { baseDir: BaseDirectory.AppData })
}

// Tags
const getTagsListPath = (folder: string, ext: 'json' | 'ts') => path.join(folder, 'assets', `tagsList.${ext}`)
const saveTagsListTypes = async (folder: string, tags: EditorTags) => {
	const tagsTypes = Object.entries(tags).reduce<Record<string, true | string>>((acc, [key, val]) => {
		if (val === true) {
			acc[key] = val
		} else {
			acc[key] = val.map(t => `'${t}'`).join('|')
		}
		return acc
	}, {})
	const tagsString = JSON.stringify(tagsTypes)
	const fileContent = `export type Tags = ${tagsString}`
	const filePath = await getTagsListPath(folder, 'ts')
	await writeTextFile(filePath, fileContent, { baseDir: BaseDirectory.AppData })
}
export const loadTagsList = async (folder: string) => {
	const filePath = await getTagsListPath(folder, 'json')
	const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData })
	if (fileExists) {
		const contents = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
		return JSON.parse(contents) as Tags
	} else {
		await writeTextFile(filePath, JSON.stringify({ }), { baseDir: BaseDirectory.AppData })
		return { } as Tags
	}
}
export const saveTagsList = async (folder: string, tags: EditorTags) => {
	await saveTagsListTypes(folder, tags)
	const filePath = await getTagsListPath(folder, 'json')
	await writeTextFile(filePath, format(tags), { baseDir: BaseDirectory.AppData })
}

// Levels
const getLevelsDirPath = (folder: string) => path.join(folder, 'assets', 'levels')
export const loadLevels = async (folder: string) => {
	return readDir(await getLevelsDirPath(folder), { baseDir: BaseDirectory.AppData })
}
export const saveLevelFile = async (folder: string, levelName: string, level: LevelData) => {
	return writeTextFile(
		await path.join(await getLevelsDirPath(folder), `${levelName}.json`),
		format(level),
		{ baseDir: BaseDirectory.AppData },
	)
}
export const removeLevel = async (folder: string, levelName: string) => {
	remove(
		await path.join(await getLevelsDirPath(folder), `${levelName}.json`),
		{ baseDir: BaseDirectory.AppData },
	)
}
export const loadLevel = async (folder: string, level: string) => {
	const data = await get(level)
	if (data) return data as LevelData
	const fileContent = await readTextFile(
		await path.join(await getLevelsDirPath(folder), `${level}.json`),
		{ baseDir: BaseDirectory.AppData },
	)
	return JSON.parse(fileContent) as LevelData
}