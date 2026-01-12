import type { tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import { faCheck, faClose } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { TagsListModal } from './TagsListModal'

export function Tags({ tags, tagsList, saveTagsList, global = true }: {
	tags: Atom<tags[]>
	tagsList: Atom<tags[]>
	saveTagsList: (tags: tags[]) => void
	global?: boolean
}) {
	const selectedTag = atom('')
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
	`
	return (
		<section>
			<div class="title">
				{global ? 'Model tags' : 'Entity tags'}
				<TagsListModal tagsList={tagsList} saveTagsList={saveTagsList}></TagsListModal>
			</div>
			<div class="tag-container">
				<For each={tags()}>
					{tag => (
						<div class="tag">
							{tag}
							<div class="tag-icon" onClick={() => tags(tags().filter(t => t !== tag))}>
								<Fa icon={faClose}></Fa>
							</div>
						</div>
					)}
				</For>

			</div>
			<div class="add-tag">
				<select value={selectedTag()} onChange={e => selectedTag(e.target.value)}>
					<For each={tagsList()}>
						{tag => <option value={tag}>{tag}</option>}
					</For>
					<option value=""></option>
				</select>
				<button onClick={() => tags([...tags(), selectedTag()])}>
					<Fa icon={faCheck}></Fa>
				</button>
			</div>
		</section>
	)
}