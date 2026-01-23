import type { Tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import type { EditorTags } from '../types'
import { faCheck, faPlus, faTags, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createEffect, For, on, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Modal } from './Modal'

export function TagsListModal({ tagsList, saveTagsList }: {
	tagsList: Atom<EditorTags>
	saveTagsList: (tags: EditorTags) => void
}) {
	const open = atom(false)
	const newTag = atom('')
	const tagValue = atom('')
	const addingTag = atom<string | null>(null)
	createEffect(on(addingTag, () => tagValue('')))
	const removeTag = (tag: string) => {
		const tags = tagsList()
		if (tags) {
			delete tags[tag]
			saveTagsList(tags)
		}
	}
	const tagValues = (tag: string) => {
		const tagsListValue = tagsList()
		const values = tagsListValue[tag]
		if (values === true) {
			return null
		}
		return values
	}
	const addTagValue = () => {
		const tagsListValue = tagsList()
		const addingTagValue = addingTag()
		if (addingTagValue) {
			if (tagsListValue[addingTagValue] === true) {
				tagsListValue[addingTagValue] = [tagValue()]
			} else {
				tagsListValue[addingTagValue].push(tagValue())
			}
			saveTagsList(tagsListValue)
			addingTag(null)
			tagValue('')
		}
	}
	const removeTagValue = (tag: string, value: string) => {
		const tagsListValue = tagsList()
		saveTagsList({
			...tagsListValue,
			[tag]: (tagsListValue[tag] as string[]).filter(x => x !== value),
		})
	}

	css/* css */`
	.new-tag{
		display: grid;
		grid-template-columns: 1fr auto;
		margin-top: auto;
	}
	.tags-wrapper{
		height: 80dvh;
		display: grid;
	}
	.tags-table{
		display: grid;
		gap: 0.5rem;
		width: 50rem;
		overflow-y: auto;
	}
	.tag-group{
		border: solid 2px var(--color-3);
		border-radius: 0.3rem;
	}
	.tag-label{
		padding: 0 1rem;
	}
	.tag-line{
		align-items: center;
		display: flex;
		justify-content: space-between;
	}
	.adding-tag{
		display: grid;
		grid-template-columns: 1fr auto;
	}
	.tag-values{
		padding: 0.2rem;
		display: flex;
		gap: 1rem;
	}
	.tag-value{
		padding: 0.2rem 0.5rem;
		background: var(--color-2);
		border-radius: 0.3rem;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
	}
	.remove-tag-value{
		color: grey;
		cursor: pointer;
	}
	.remove-tag-value:hover{
		color: white;
	}
	`
	return (
		<Modal
			trigger={(
				<button onClick={() => open(!open())}>
					<Fa icon={faTags}></Fa>
				</button>
			)}
			open={open}
		>
			<div class="tags-wrapper">
				<div class="tags-table">
					<For each={Object.keys(tagsList())}>
						{tag => (
							<div class="tag-group">
								<div class="tag-line">
									<div class="tag-label">{tag}</div>
									<div>
										<button onClick={() => addingTag(tag)}>
											<Fa icon={faPlus}></Fa>
										</button>
										<button onClick={() => removeTag(tag)}>
											<Fa icon={faTrash}></Fa>
										</button>
									</div>
								</div>
								<Show when={tagValues(tag)}>
									{value => (
										<div class="tag-values">
											<For each={value()}>
												{val => (
													<div class="tag-value">
														{val}
														<div class="remove-tag-value" onClick={() => removeTagValue(tag, val)}>
															<Fa icon={faXmark}></Fa>
														</div>
													</div>
												)}
											</For>
										</div>
									)}
								</Show>
								<Show when={addingTag() === tag}>
									<div class="adding-tag">
										<input value={tagValue()} onChange={e => tagValue(e.target.value)}></input>
										<button onClick={addTagValue}>
											<Fa icon={faPlus}></Fa>
										</button>
									</div>
								</Show>
							</div>
						)}
					</For>
				</div>
				<div class="new-tag">
					<input value={newTag()} onChange={e => newTag(e.target.value)}></input>
					<button onClick={() => saveTagsList({ ...tagsList(), [newTag() as keyof Tags]: true })}>
						<Fa icon={faCheck}></Fa>
					</button>
				</div>
			</div>
		</Modal>
	)
}