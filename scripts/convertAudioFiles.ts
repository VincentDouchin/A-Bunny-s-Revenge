import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { glob } from 'glob'
import type { PluginOption } from 'vite'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && ['mp3', 'wav'].includes(filePath.split('.').at(-1) ?? '')))) {
		console.log('converting audio files')
		const audioFiles = filePath ? [filePath] : await glob('./assets/*/*.{wav,mp3}')
		for (const path of audioFiles) {
			const ogg = await glob('./assets/*/*.ogg')
			const outputPath = path.replace(/(?:wav|mp3)/g, 'ogg')
			console.log(ogg.includes(outputPath), path)
			if (!ogg.includes(outputPath)) {
				ffmpeg.setFfmpegPath(ffmpegPath)
				const outStream = createWriteStream(outputPath)

				await new Promise<void>((resolve) => {
					ffmpeg()
						.input(path)
						.audioQuality(96)
						.toFormat('ogg')
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