import type { Tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import type { EditorTags } from '../types'
import { faCheck, faClose } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createMemo, For, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { TagsListModal } from './TagsListModal'

export function TagsEditor({ tags, tagsList, saveTagsList, global = true }: {
	tags: Atom<Partial<Tags>>
	tagsList: Atom<EditorTags>
	saveTagsList: (tags: EditorTags) => void
	global?: boolean
}) {
	const selectedTag = atom('')
	const tagValue = atom('')
	const tagValues = createMemo(() => {
		const values = tagsList()?.[selectedTag()]
		if (values !== true) {
			return values
		} else {
			return null
		}
	})

	const removeTag = (tag: string) => {
		const tagsValue = tags()
		delete tagsValue[tag as keyof Tags]
		tags(tagsValue)
	}
	const addTag = () => {
		if (tagValues() !== null) {
			if (tagValue() !== '') {
				tags({ ...tags(), [selectedTag()]: tagValue() })
			}
		} else {
			tags({ ...tags(), [selectedTag()]: true })
		}
	}

	css/* css */`
	.tag-container{
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 1rem;
	}
	.tag{
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: ${global ? 'var(--global-tag-color)' : 'var(--entity-tag-color)'};
		padding: 0 0.3rem;
		border-radius: 0.2rem;
	}
	.tag-icon{
		cursor:pointer;
	}
	.tag-icon:hover{
		color: grey;
	}
	.add-tag{
		display: grid;
		grid-template-columns:1fr auto;
	}
	.add-tag.with-option{
		grid-template-columns:1fr 1fr auto;
	}
	`
	return (
		<section>
			<div class="title">
				{global ? 'Model tags' : 'Entity tags'}
				<TagsListModal tagsList={tagsList} saveTagsList={saveTagsList}></TagsListModal>
			</div>
			<div class="tag-container">
				<For each={Object.entries(tags())}>
					{([tag, val]) => (
						<div class="tag">
							{tag}
							{val === true ? '' : ` ${val}`}
							<div class="tag-icon" onClick={() => removeTag(tag)}>
								<Fa icon={faClose}></Fa>
							</div>
						</div>
					)}
				</For>

			</div>
			<div class="add-tag" classList={{ 'with-option': selectedTag() !== '' && tagValues() !== null }}>
				<select value={selectedTag()} onChange={e => selectedTag(e.target.value)}>
					<For each={Object.entries(tagsList())}>
						{([tag, _val]) => <option value={tag}>{tag}</option>}
					</For>
					<option value=""></option>
				</select>
				<Show when={tagValues()}>
					{values => (
						<select value={tagValue()} onChange={e => tagValue(e.target.value)}>
							<For each={values()}>
								{tag => <option value={tag}>{tag}</option>}
							</For>
							<option value=""></option>
						</select>
					)}
				</Show>
				<button onClick={addTag}>
					<Fa icon={faCheck}></Fa>
				</button>
			</div>
		</section>
	)
}