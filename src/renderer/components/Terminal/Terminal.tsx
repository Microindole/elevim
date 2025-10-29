// src/renderer/components/Terminal/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './Terminal.css';

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    // *** Add a ref to track if initialization IPC has been sent ***
    const initIpcSent = useRef(false);

    useEffect(() => {
        // Prevent re-initialization if instance already exists
        if (!terminalRef.current || terminalInstance.current) return;
        console.log('[Renderer] TerminalComponent useEffect run');

        // 1. Initialize xterm instance (as before)
        const term = new Terminal({
            cursorBlink: true,
            theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff' }
        });

        // 2. Load FitAddon (as before)
        const addon = new FitAddon();
        term.loadAddon(addon);

        // 3. Attach to DOM (as before)
        term.open(terminalRef.current);

        // 4. Fit to container (as before)
        addon.fit();

        // Store refs
        terminalInstance.current = term;
        fitAddon.current = addon;

        // *** 5. Only send IPC init if it hasn't been sent for this mount cycle ***
        if (!initIpcSent.current) {
            console.log('[Renderer] Calling terminalInit via IPC');
            window.electronAPI.terminalInit();
            initIpcSent.current = true; // Mark as sent
        }

        // 6. Handle user input (as before)
        term.onData((data) => {
            // Check instance before writing
            if (terminalInstance.current) {
                window.electronAPI.terminalWrite(data);
            }
        });

        // 7. Handle data from main process (as before)
        const unregisterOnData = window.electronAPI.onTerminalData((data) => {
            // Check instance before writing
            if (terminalInstance.current) {
                terminalInstance.current?.write(data);
            }
        });

        // 8. Handle resize (as before, but add checks)
        const handleResize = () => {
            if (fitAddon.current && terminalInstance.current) {
                try {
                    fitAddon.current?.fit(); // This might throw if disposed
                    const { cols, rows } = terminalInstance.current;
                    // Check validity before sending
                    if (cols > 0 && rows > 0) {
                        window.electronAPI.terminalResize({ cols, rows });
                    }
                } catch (e) {
                    console.error('[Renderer] Error during terminal fit/resize:', e);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial resize

        // 9. Cleanup
        return () => {
            console.log('[Renderer] TerminalComponent cleanup executing');
            unregisterOnData(); // Crucial: Remove the listener
            window.removeEventListener('resize', handleResize);

            // Dispose the terminal instance
            if (terminalInstance.current) {
                terminalInstance.current?.dispose();
                console.log('[Renderer] xterm instance disposed');
            }

            // Clear refs
            terminalInstance.current = null;
            fitAddon.current = null;
            // *** Reset the IPC sent flag only after *full* cleanup ***
            // This ensures if StrictMode remounts, it will send init again.
            initIpcSent.current = false;
            console.log('[Renderer] TerminalComponent cleanup finished');
        };
    }, []); // Keep empty dependency array

    return (
        <div className="terminal-container">
            <div ref={terminalRef} className="terminal-wrapper" />
        </div>
    );
}