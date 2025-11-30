import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Elevim',
  tagline: '回归代码的禅意 (Zen Mode)',
  favicon: 'img/favicon.ico', // 记得把你的 logo.png 放进去

  // 设置你的域名
  url: 'https://elevim.microindole.me',
  baseUrl: '/',

  // GitHub Pages 部署配置 (Cloudflare Pages 不需要这些，但填上也无妨)
  organizationName: 'Microindole',
  projectName: 'elevim',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // 指向你的项目文档目录 (可选)
          // 如果你想直接用项目根目录的 docs，需要配置一下 plugin-content-docs
        },
        blog: false, // 如果不需要博客可以关闭
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // 替换为你的 social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Elevim',
      logo: {
        alt: 'Elevim Logo',
        src: 'img/logo.svg', // 替换为你的 logo
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        {
          href: 'https://github.com/Microindole/elevim',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: '快速开始',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Issues',
              href: 'https://github.com/Microindole/elevim/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Microindole/elevim',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Microindole. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;