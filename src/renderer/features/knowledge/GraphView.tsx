import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface GraphViewProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenFile: (path: string) => void;
    isDark: boolean; // 用于适配暗色主题
}

export default function GraphView({ isOpen, onClose, onOpenFile, isDark }: GraphViewProps) {
    const [data, setData] = useState({ nodes: [], links: [] });
    const graphRef = useRef<any>();

    useEffect(() => {
        if (isOpen) {
            // 加载数据
            window.electronAPI.file.getGraphData().then((graphData: any) => {
                setData(graphData);
            });
        }
    }, [isOpen]);

    // 监听 ESC 关闭
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            backgroundColor: isDark ? '#1a1b26' : '#ffffff', // 背景色适配
            zIndex: 500, // 在编辑器之上，但在 CommandPalette 之下
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 顶部工具栏 */}
            <div style={{
                padding: '10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(128,128,128,0.2)',
                backgroundColor: isDark ? '#16161e' : '#f0f0f0',
                color: isDark ? '#fff' : '#000'
            }}>
                <span style={{ fontWeight: 'bold' }}>Knowledge Graph</span>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {data.nodes.length} files · {data.links.length} links
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 'none',
                        fontSize: '20px', cursor: 'pointer',
                        color: 'inherit'
                    }}
                >
                    ×
                </button>
            </div>

            {/* 图谱区域 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <ForceGraph2D
                    ref={graphRef}
                    graphData={data}
                    nodeLabel="name"
                    nodeColor={() => isDark ? '#7aa2f7' : '#007acc'} // 节点颜色
                    nodeRelSize={6}
                    linkColor={() => isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    backgroundColor={isDark ? '#1a1b26' : '#ffffff'}
                    onNodeClick={(node: any) => {
                        onOpenFile(node.path); // 点击节点打开文件
                        onClose(); // 关闭图谱
                    }}
                    // 力导向配置，让图更舒展
                    d3VelocityDecay={0.1}
                    cooldownTicks={100}
                />
            </div>
        </div>
    );
}