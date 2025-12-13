import React from 'react';
import { useWriterFile } from '../hooks/useWriterFile';
import { WriterEditor } from '../components/WriterEditor';

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: '#fff', // 写作模式通常用亮色背景
    },
    toolbar: {
        height: '40px',
        borderBottom: '1px solid #eaeaea',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
        backgroundColor: '#fafafa',
        fontSize: '12px',
        color: '#666'
    },
    button: {
        padding: '4px 8px',
        cursor: 'pointer',
        background: 'transparent',
        border: '1px solid #ddd',
        borderRadius: '3px',
        marginLeft: '10px'
    },
    editorArea: {
        flex: 1,
        overflow: 'hidden', // 让 CodeMirror 处理滚动
        position: 'relative' as const
    }
};

const App: React.FC = () => {
    const { content, filePath, isDirty, handleContentChange, saveFile } = useWriterFile();

    const switchToCodeMode = () => {
        // 切换回代码模式
        window.electronAPI.settings.setSetting('mode', 'code');
    };

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong>Elevim Writer</strong>
                    <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                    <span>{filePath ? filePath : 'Unsaved File'}</span>
                    {isDirty && <span style={{ color: 'orange', marginLeft: '5px' }}>●</span>}
                </div>

                <div>
                    <button style={styles.button} onClick={saveFile}>保存 (Ctrl+S)</button>
                    <button style={styles.button} onClick={switchToCodeMode}>切换回 IDE 模式</button>
                </div>
            </div>

            <div style={styles.editorArea}>
                <WriterEditor content={content} onChange={handleContentChange} />
            </div>
        </div>
    );
};

export default App;