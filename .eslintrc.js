// .eslintrc.js
module.exports = {
    // 解析器，让 ESLint 理解 TypeScript
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest', // 使用最新的 ECMAScript 功能
        sourceType: 'module', // 使用 ES Modules
        ecmaFeatures: {
            jsx: true // 启用 JSX 解析
        },
        project: './tsconfig.json' // 指定 tsconfig 文件，某些 TS 规则需要类型信息
    },
    // 环境设置
    env: {
        browser: true, // 代码运行在浏览器环境 (Electron Renderer)
        es2021: true,
        node: false // 通常不直接使用 Node.js API (除了 preload 暴露的)
    },
    // 插件列表
    plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks'
    ],
    // 继承的规则集 (顺序很重要，后面的会覆盖前面的)
    extends: [
        'eslint:recommended', // ESLint 核心推荐规则
        'plugin:@typescript-eslint/recommended', // TypeScript 推荐规则
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // 如果需要类型检查规则 (可能较慢)
        'plugin:react/recommended', // React 推荐规则
        'plugin:react-hooks/recommended', // React Hooks 推荐规则
    ],
    // 覆盖或添加自定义规则
    rules: {
        // TypeScript 相关
        '@typescript-eslint/no-unused-vars': 'warn', // 未使用的变量报警告
        '@typescript-eslint/no-explicit-any': 'warn', // 允许 any，但报警告

        // React 相关
        'react/prop-types': 'off', // 在 TS 项目中通常不需要 prop-types
        'react/react-in-jsx-scope': 'off', // React 17+ 不需要显式导入 React

        // 其他自定义规则
        'no-console': 'off', // 允许使用 console.log
        'semi': ['warn', 'always'], // 要求分号，但只报警告
        // 在这里添加更多你需要的规则...
    },
    settings: {
        react: {
            version: 'detect' // 自动检测 React 版本
        }
    },
    ignorePatterns: [
        "node_modules/", // 忽略 node_modules
        "dist/",         // 忽略构建输出目录
        "build.js",      // 忽略构建脚本本身
        ".eslintrc.js"   // 忽略 ESLint 配置文件本身
    ] // 可以添加需要 ESLint 忽略的文件或目录
};