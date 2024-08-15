/// <reference types="vite/client" />
import '@total-typescript/ts-reset'

declare module '@json-editor/json-editor';

type Prettify<T> = {
	[K in keyof T]: T[K];
} & unknown