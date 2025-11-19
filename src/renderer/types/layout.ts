// src/renderer/types/layout.ts
import { OpenFile } from '../components/Tabs/Tabs';

export interface EditorGroup {
    id: string;
    files: OpenFile[];
    activeIndex: number;
}