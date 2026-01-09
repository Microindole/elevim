// src/renderer/features/settings/components/SettingsPanel/SettingsRegistry.ts
import React from 'react';
import { AppSettings } from '../../../../../shared/types';
import GeneralSection from './sections/GeneralSection';
import AppearanceSection from './sections/AppearanceSection';
import EditorSection from './sections/EditorSection';
import KeybindingsSection from './sections/KeybindingsSection';
import AboutSection from './sections/AboutSection';

// 1. 定义每个设置板块组件接收的 Props
export interface SectionProps {
    settings: AppSettings;
    onSave: (key: keyof AppSettings, value: any) => void;
    searchTerm?: string; // 如果以后要做内容搜索，可以传进去
}

// 2. 定义注册项的结构
export interface SettingSectionConfig {
    id: string;
    label: string;
    icon: string; // class name of the icon
    Component: React.FC<SectionProps>;
}

// 3. 注册表（工厂列表）
// 这里就像一个“工厂清单”，以后要加新功能，只需要在这里加一行，写个新文件即可
export const SETTINGS_SECTIONS: SettingSectionConfig[] = [
    {
        id: 'general',
        label: 'General',
        icon: 'settings', // 对应 codicon
        Component: GeneralSection
    },
    {
        id: 'appearance',
        label: 'Appearance',
        icon: 'paint-can',
        Component: AppearanceSection
    },
    {
        id: 'editor',
        label: 'Editor',
        icon: 'code',
        Component: EditorSection
    },
    {
        id: 'keybindings',
        label: 'Keybindings',
        icon: 'keyboard',
        Component: KeybindingsSection
    },
    {
        id: 'about',
        label: 'About',
        icon: 'info',
        Component: AboutSection
    }
];