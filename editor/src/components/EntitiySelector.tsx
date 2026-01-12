import type { Accessor, Setter } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import type { Object3D } from 'three'
import type { getThumbnailRenderer } from '../../../src/lib/thumbnailRenderer'
import type { AssetData } from '../types'
import { faCube, faGear } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createEffect, createMemo, For, on, Show } from 'solid-js'
import { createMutable } from 'solid-js/store'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { loadImage } from '../../../src/global/assetLoaders'

export function EntitySelector({ selectedCategory, entities, selectedAsset, setMode, thumbnailRenderer, boundingBox, assetInMap }: {
	selectedCategory: Atom<string | null>
	thumbnailRenderer: ReturnType<typeof getThumbnailRenderer>
	selectedAsset: Atom<string | null>
	entities: Record<string, Record<string, Object3D>>
	boundingBox: Record<string, Record<string, AssetData>>
	model: Accessor<Object3D | null>
	setMode: Setter<'level' | 'entity'>
	assetInMap: Accessor<string | null>
}) {
	const tabs = createMemo(() => Object.keys(entities).toSorted((a, b) => a.localeCompare(b)))
	const thumbnails = createMutable <Record<string, Record<string, HTMLCanvasElement | HTMLImageElement>>>({})
	const assets = createMemo(() => {
		const category = selectedCategory()
		if (category) {
			return Object.keys(entities[category]).toSorted((a, b) => a.localeCompare(b))
		}
		return []
	})

	const editEntity = (category: string, asset: string) => {
		setMode('entity')
		selectedCategory(category)
		selectedAsset(asset)
	}

	const createThumbnail = (category: string, asset: string) => {
		const canvas = thumbnailRenderer.getCanvas(entities[category][asset], true, 1)
		localStorage.setItem(`${category}-${asset}-thumbnail`, canvas.toDataURL())
		return canvas
	}

	const generateThumbnail = async (category: string, assets: string[]) => {
		const asset = assets.pop()
		if (asset) {
			const url = localStorage.getItem(`${category}-${asset}-thumbnail`)
			generateThumbnail(category, assets)
			if (url) {
				setTimeout(() => createThumbnail(category, asset), 10)
				thumbnails[category][asset] = await loadImage(url)
			} else {
				thumbnails[category][asset] = createThumbnail(category, asset)
			}
		}
	}

	createEffect(() => {
		const category = selectedCategory()
		if (category) {
			thumbnails[category] = {}
			generateThumbnail(category, Object.keys(entities[category]))
		}
	})

	const assetContainer = atom<HTMLElement | null>(null)

	const scrollAssets = (e: WheelEvent) => {
		assetContainer()?.scrollBy({ left: e.deltaY })
		e.preventDefault()
	}
	const thumbnailsRefs = createMutable<Record<string, HTMLElement>>({})
	const selectedRef = createMemo(() => {
		const category = selectedCategory()
		const asset = assetInMap()
		if (category && asset) {
			return thumbnailsRefs[category + asset]
		}
	})
	createEffect(on(selectedRef, (ref) => {
		setTimeout(() => ref?.scrollIntoView({ inline: 'center' }), 10)
	}))

	css/* css */`
	.entity-selector{
		display: grid;
		grid-template-rows: auto 1fr;
	}
	.assets{
		display: flex;
		overflow-x: auto;
	}
	.entity-button{
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.5rem;
		height: 100%;
	}
	.current{
		background: var(---color-3)
	}
	@global{
		.entity-button canvas,
		.entity-button img{
			height: 70%;
		}

	}
	.edit-entity{
		color: gray;
		transition: color ease 0.2s;
	}
	.edit-entity:hover{
		color: white;
	}
	.entity-title{
		display: grid;
		grid-template-columns: auto 1fr auto;
	}
	.entity-name{
		text-overflow: ellipsis;
    	overflow: hidden;
	}
	`
	return (
		<div class="entity-selector">
			<div class="tabs">
				<For each={tabs()}>
					{key => <button classList={{ selected: selectedCategory() === key }} onClick={() => selectedCategory(key)}>{key}</button>}
				</For>
			</div>
			<div class="assets" onWheel={scrollAssets} ref={el => assetContainer(el)}>
				<Show when={selectedCategory()}>
					{category => (
						<For each={assets()}>
							{asset => (
								<button
									class="entity-button"
									classList={{ selected: selectedAsset() === asset, current: assetInMap() === asset }}
									onClick={() => {
										selectedAsset(asset)
										selectedCategory(category())
									}}
									ref={el => thumbnailsRefs[category() + asset] = el}
								>
									<div class="entity-title">
										<div class="collider-icon">
											<Show when={boundingBox?.[category()]?.[asset]?.collider}><Fa icon={faCube}></Fa></Show>
										</div>
										<div class="entity-name" title={asset}>{asset}</div>
										<div class="edit-entity" onClick={() => editEntity(category(), asset)}>
											<Fa icon={faGear}></Fa>
										</div>
									</div>
									{thumbnails[category()]?.[asset]}
								</button>
							)}
						</For>
					)}
				</Show>
			</div>
		</div>
	)
}