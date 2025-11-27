// src/renderer/App.tsx
import React from 'react';
import { useAppController } from './hooks/useAppController';
import { MainLayout } from './layouts/MainLayout';
import './App.css';

export default function App() {
    const controller = useAppController();

    if (!controller.settings || !controller.isReady) {
        return (
            <div className="main-layout" style={{ justifyContent: 'center', alignItems: 'center', color: '#888' }}>
                Restoring Workspace...
            </div>
        );
    }

    return <MainLayout {...controller} />;
}