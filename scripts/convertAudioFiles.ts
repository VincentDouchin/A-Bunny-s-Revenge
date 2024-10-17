import type { PathInfo } from './assetPipeline'
import { createWriteStream } from 'node:fs'
import { rename } from 'node:fs/promises'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import { AssetTransformer } from './assetPipeline'

export class ConverAudioFiles extends AssetTransformer {
	extensions = ['mp3', 'wav', 'ogg']
	async add(path: PathInfo) {
		if (!path.extension) return
		const outputPath = path.full.replace(path.extension, 'webm')

		ffmpeg.setFfmpegPath(ffmpegPath)

		await new Promise<void>((resolve) => {
			const outStream = createWriteStream(outputPath)
			ffmpeg()
				.noVideo()
				.input(path.full)
				.toFormat('webm')
				.on('error', (error) => {
					console.log(`Encoding Error: ${error.message}`)
					resolve()
				})
				.on('exit', () => {
					console.log('Audio recorder exited')
					resolve()
				})
				.on('close', () => {
					console.log('Audio recorder closed')
					resolve()
				})
				.on('end', () => {
					console.log('Audio Transcoding succeeded !')
					resolve()
				})
				.pipe(outStream, { end: true })
		})
		await rename(path.full, path.full.replace('assets', 'rawAssets\\convertedAssets'))
	}

	remove() { }
	generate() { }
}