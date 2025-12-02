import * as path from 'path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  outDir: 'build',
  root: path.join(__dirname, 'docs'),
  title: 'Elevim',
  description: '轻量级、现代化的代码编辑器',
  icon: '/logo.png',
  logo: {
    light: '/logo.png',
    dark: '/logo.png',
  },
  globalStyles: path.join(__dirname, 'docs/index.css'),
  themeConfig: {
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/Microindole/elevim' },
    ],
    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: '快捷键', link: '/reference/keybindings', activeMatch: '/reference/' },
      { text: '架构', link: '/architecture/overview', activeMatch: '/architecture/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '核心功能', link: '/guide/features' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '知识库管理', link: '/guide/knowledge-base' },
            { text: 'Git 集成', link: '/guide/git' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '手册',
          items: [
            { text: '键盘快捷键', link: '/reference/keybindings' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '开发',
          items: [
            { text: '架构概览', link: '/architecture/overview' },
          ],
        },
      ],
    },
    footer: {
      message: '© 2025 Microindole. Designed for efficiency.',
    },
  },
});