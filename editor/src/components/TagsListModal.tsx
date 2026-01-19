import type { Tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import type { EditorTags } from '../types'
import { faCheck, faPlus, faTags, faTrash } from '@fortawesome/free-solid-svg-icons'
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

	css/* css */`
	.new-tag{
		display: grid;
		grid-template-columns: 1fr auto;
	}
	.tags-table{
		display: grid;
		gap: 0.5rem;
	}
	.tag-line{
		display: flex;
		justify-content: space-between;
	}
	.adding-tag{
		display: grid;
		grid-template-columns: 1fr auto;
	}
	.tag-values{
		padding: 0.5rem;
		display: flex;
		gap: 1rem;
		background: var(--color-2);
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
			<div class="tags-table">
				<For each={Object.entries(tagsList())}>
					{([tag, value]) => (
						<>
							<div class="tag-line">
								{tag}
								<div>
									<button onClick={() => addingTag(tag)}>
										<Fa icon={faPlus}></Fa>
									</button>
									<button onClick={() => removeTag(tag)}>
										<Fa icon={faTrash}></Fa>
									</button>
								</div>
							</div>
							<Show when={value !== true && value}>
								{value => (
									<div class="tag-values">
										<For each={value()}>
											{val => <div>{val}</div>}
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
						</>
					)}
				</For>
			</div>
			<div class="new-tag">
				<input value={newTag()} onChange={e => newTag(e.target.value)}></input>
				<button onClick={() => saveTagsList({ ...tagsList(), [newTag() as keyof Tags]: true })}>
					<Fa icon={faCheck}></Fa>
				</button>
			</div>
		</Modal>
	)
}