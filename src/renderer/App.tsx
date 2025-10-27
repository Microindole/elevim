import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from '@codemirror/theme-one-dark';

const defaultTitle = "Elevim Editor";

export default function App() {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [currentFileName, setCurrentFileName] = useState("Untitled");

    const handleSave = async () => {
        if (viewRef.current) {
            const content = viewRef.current.state.doc.toString();
            const savedPath = await window.electronAPI.saveFile(content);
            if (savedPath) {
                setCurrentFileName(savedPath.split(/[\\/]/).pop() ?? "Untitled");
                setIsDirty(false);
            }
        }
    };

    useEffect(() => {
        const dirtyMarker = isDirty ? "*" : "";
        const titleText = `${dirtyMarker}${currentFileName} - ${defaultTitle}`;
        window.electronAPI.setTitle(titleText);
    }, [isDirty, currentFileName]);


    useEffect(() => {
        if (editorRef.current) {
            const updateListener = EditorView.updateListener.of((update) => {
                if (update.docChanged && !isDirty) {
                    setIsDirty(true);
                }
            });

            const saveKeyBinding = keymap.of([{
                key: "Mod-s",
                run: (view) => {
                    handleSave();
                    return true;
                }
            }]);

            const startState = EditorState.create({
                doc: `// Welcome to Elevim with React!\n// Use CmdOrCtrl+O to open a file.`,
                extensions: [
                    basicSetup,
                    oneDark,
                    updateListener,
                    saveKeyBinding
                ],
            });

            const view = new EditorView({
                state: startState,
                parent: editorRef.current,
            });
            viewRef.current = view;

            return () => {
                view.destroy();
            };
        }
    }, []);

    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.onFileOpen((data) => {
            const view = viewRef.current;
            if (view) {
                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: data.content }
                });
                setCurrentFileName(data.filePath.split(/[\\/]/).pop() ?? "Untitled");
                setIsDirty(false);
            }
        });

        const unregisterTriggerSave = window.electronAPI.onTriggerSave(async () => {
            handleSave();
        });

        const unregisterNewFile = window.electronAPI.onNewFile(() => {
            const view = viewRef.current;
            if (view) {
                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: "" }
                });
                setCurrentFileName("Untitled");
                setIsDirty(false);
            }
        });

        return () => {
            // cleanup if necessary
        };
    }, []);


    return (
        <>
            <div id="title-bar">
                <div id="menu-bar">
                    <div className="menu-item">
                        File
                        <div className="submenu">
                            <div className="submenu-item" onClick={() => window.electronAPI.triggerNewFile()}>New File</div>
                            <hr className="submenu-separator" />
                            <div className="submenu-item" onClick={() => window.electronAPI.showOpenDialog()}>Open File...</div>
                            <div className="submenu-item" onClick={() => window.electronAPI.triggerSaveFile()}>Save</div>
                            <div className="submenu-item" onClick={() => window.electronAPI.triggerSaveAsFile()}>Save As...</div>
                            <hr className="submenu-separator" />
                            <div className="submenu-item" onClick={() => window.electronAPI.closeWindow()}>Quit</div>
                        </div>
                    </div>
                </div>
                <div id="title">{`${isDirty ? '*' : ''}${currentFileName} - ${defaultTitle}`}</div>
                <div id="title-bar-btns">
                    <button id="minimize-btn" onClick={() => window.electronAPI.minimizeWindow()}>-</button>
                    <button id="maximize-btn" onClick={() => window.electronAPI.maximizeWindow()}>o</button>
                    <button id="close-btn" onClick={() => window.electronAPI.closeWindow()}>x</button>
                </div>
            </div>

            <div id="editor" ref={editorRef}></div>
        </>
    );
}