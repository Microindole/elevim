// src/renderer/app/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initRpcClient } from '../utils/rpc-client'; // 导入

// 初始化 RPC
initRpcClient();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);