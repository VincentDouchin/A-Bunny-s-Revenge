import { createWriteStream } from 'node:fs'
import { rename, unlink } from 'node:fs/promises'
import { glob } from 'glob'
import type { PluginOption } from 'vite'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && ['mp3', 'wav'].includes(filePath.split('.').at(-1) ?? '')))) {
		console.log('converting audio files')
		const audioFiles = filePath ? [filePath] : await glob('./assets/*/*.{wav,mp3,ogg}')
		for (const path of audioFiles) {
			const ogg = await glob('./assets/*/*.ogg')
			const outputPath = path.replace(/(?:wav|mp3|ogg)/g, 'webm')
			console.log(ogg.includes(outputPath), path)
			if (!ogg.includes(outputPath)) {
				ffmpeg.setFfmpegPath(ffmpegPath)

				await new Promise<void>((resolve) => {
					const outStream = createWriteStream(outputPath)
					ffmpeg()
						.noVideo()
						.input(path)
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
				await rename(path, path.replace('assets', 'rawAssets\\convertedAssets'))
			} else {
				unlink(path)
			}
		}
	}
}

export const convertAudioFiles = (): PluginOption => {
	launchScript()
	return {
		name: 'watch-assets',
		apply: 'serve',
		configureServer(server) {
			server.watcher.on('add', launchScript)
		},

	}
}