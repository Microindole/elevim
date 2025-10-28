// src/renderer/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 导入唯一的 CSS 入口文件
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);