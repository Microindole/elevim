// src/renderer/features/knowledge/GraphView.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import ForceGraph2D, { GraphData, NodeObject, LinkObject } from 'react-force-graph-2d';

// 扩展节点类型
interface CustomNodeObject extends NodeObject {
    id: string;
    name: string;
    path: string;
    val: number;
    neighbors?: CustomNodeObject[];
    links?: LinkObject[];
}

interface GraphViewProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenFile: (path: string) => void;
    isDark: boolean;
}

// [修复] 定义 ControlButton 的 Props 类型
interface ControlButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    isDark: boolean;
}

// [修复] 将 ControlButton 提到外面并加上类型
const ControlButton: React.FC<ControlButtonProps> = ({ onClick, children, title, isDark }) => (
    <button
        onClick={onClick} title={title}
        style={{
            background: isDark ? '#222' : '#fff',
            border: 'none', borderRight: `1px solid ${isDark ? '#333' : '#ddd'}`,
            color: isDark ? '#ccc' : '#555',
            cursor: 'pointer', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px'
        }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? '#333' : '#eee'}
        onMouseLeave={e => e.currentTarget.style.background = isDark ? '#222' : '#fff'}
    >
        {children}
    </button>
);

export default function GraphView({ isOpen, onClose, onOpenFile, isDark }: GraphViewProps) {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const fgRef = useRef<any>();
    const [highlightNodes, setHighlightNodes] = useState(new Set<string>());
    const [highlightLinks, setHighlightLinks] = useState(new Set<LinkObject>());
    const [hoverNode, setHoverNode] = useState<CustomNodeObject | null>(null);

    // 1. 数据加载
    useEffect(() => {
        if (isOpen) {
            window.electronAPI.file.getGraphData().then((graphData: any) => {
                const nodesById = new Map(graphData.nodes.map((n: any) => [n.id, n]));
                graphData.nodes.forEach((node: any) => {
                    node.neighbors = [];
                    node.links = [];
                });
                graphData.links.forEach((link: any) => {
                    const a = nodesById.get(link.source);
                    const b = nodesById.get(link.target);
                    if (a && b) {
                        a.neighbors.push(b);
                        b.neighbors.push(a);
                        a.links.push(link);
                        b.links.push(link);
                    }
                });
                graphData.nodes.forEach((node: any) => {
                    node.val = Math.min(1 + (node.neighbors.length || 0) * 0.5, 10);
                });
                setData(graphData);
            });
        }
    }, [isOpen]);

    // 2. ESC 关闭
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // 3. 滚轮平滑缩放处理
    useEffect(() => {
        if (!isOpen) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = 1 - e.deltaY * 0.001;
                const currentZoom = fgRef.current?.zoom();
                if (currentZoom) {
                    fgRef.current.zoom(currentZoom * zoomFactor, 0);
                }
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [isOpen]);

    // 4. 样式计算
    const themeColors = useMemo(() => ({
        bg: isDark ? '#1a1b26' : '#ffffff',
        text: isDark ? '#c0caf5' : '#333333',
        node: isDark ? '#7aa2f7' : '#007acc',
        nodeHighlight: isDark ? '#bb9af7' : '#ff5722',
        link: isDark ? 'rgba(192, 202, 245, 0.2)' : 'rgba(0, 0, 0, 0.15)',
        linkHighlight: isDark ? '#bb9af7' : '#ff5722',
    }), [isDark]);

    // [关键修复]：将条件返回移到所有 Hook 之后！
    if (!isOpen) return null;

    // --- 以下为渲染逻辑 ---
    const handleNodeHover = (node: CustomNodeObject | null) => {
        setHoverNode(node);
        const newHighlightNodes = new Set<string>();
        const newHighlightLinks = new Set<LinkObject>();
        if (node) {
            newHighlightNodes.add(node.id);
            node.neighbors?.forEach(neighbor => newHighlightNodes.add(neighbor.id));
            node.links?.forEach(link => newHighlightLinks.add(link));
        }
        setHighlightNodes(newHighlightNodes);
        setHighlightLinks(newHighlightLinks);
    };

    const zoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.2, 400);
    const zoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.2, 400);
    const zoomToFit = () => fgRef.current?.zoomToFit(400, 50);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: themeColors.bg, zIndex: 500, display: 'flex', flexDirection: 'column'
        }}>
            {/* Toolbar */}
            <div style={{
                padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                backgroundColor: isDark ? '#16161e' : '#f8f9fa', color: themeColors.text
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>🕸️ Knowledge Graph</span>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                        {data.nodes.length} files, {data.links.length} links
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', border: `1px solid ${isDark ? '#333' : '#ddd'}`, borderRadius: '4px', overflow: 'hidden' }}>
                        <ControlButton onClick={zoomIn} title="Zoom In" isDark={isDark}>+</ControlButton>
                        <ControlButton onClick={zoomOut} title="Zoom Out" isDark={isDark}>-</ControlButton>
                        <ControlButton onClick={zoomToFit} title="Reset View" isDark={isDark}>⊙</ControlButton>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                            color: 'inherit', lineHeight: 1, marginLeft: '10px'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Graph */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <ForceGraph2D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="name"
                    nodeRelSize={6}
                    nodeColor={(node: any) => {
                        if (hoverNode && !highlightNodes.has(node.id)) {
                            return isDark ? 'rgba(122, 162, 247, 0.2)' : 'rgba(0, 122, 204, 0.2)';
                        }
                        if (node === hoverNode) return themeColors.nodeHighlight;
                        return themeColors.node;
                    }}
                    linkWidth={(link) => highlightLinks.has(link) ? 2 : 1}
                    linkColor={(link) => highlightLinks.has(link) ? themeColors.linkHighlight : themeColors.link}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.1}
                    onNodeHover={handleNodeHover as any}
                    onNodeClick={(node: any) => {
                        onOpenFile(node.path);
                        onClose();
                    }}
                    d3VelocityDecay={0.1}
                    cooldownTicks={200}
                    d3Force={('charge', (d3: any) => {
                        d3.forceManyBody().strength(-300);
                    })}
                    onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                />
                {hoverNode && (
                    <div style={{
                        position: 'absolute', bottom: '20px', left: '20px',
                        padding: '10px 15px', borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
                        color: themeColors.text, backdropFilter: 'blur(4px)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        pointerEvents: 'none'
                    }}>
                        <strong>{hoverNode.name}</strong>
                        <div style={{fontSize: '12px', opacity: 0.8, marginTop: '4px'}}>
                            {hoverNode.neighbors?.length} connections
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}