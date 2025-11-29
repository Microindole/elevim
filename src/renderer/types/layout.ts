// src/renderer/types/layout.ts
import { OpenFile } from '../features/editor/components/Tabs/Tabs';

export interface EditorGroup {
    id: string;
    files: OpenFile[];
    activeIndex: number;
}