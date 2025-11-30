import React from 'react';
import Layout from '@theme/Layout';

export default function Features() {
    return (
        <Layout title="功能特性" description="Elevim 的强大功能">
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1>✨ 深度功能预览</h1>
                <p>这里不仅仅是文档，而是图文并茂的功能展示区。</p>

                {/* 你可以像在 App 里一样写 Flex 布局 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <div className="card">Zen Mode 演示</div>
                    <div className="card">Git Graph 演示</div>
                </div>
            </div>
        </Layout>
    );
}