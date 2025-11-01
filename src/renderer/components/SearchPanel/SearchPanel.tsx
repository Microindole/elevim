// src/renderer/components/SearchPanel/SearchPanel.tsx
import React from 'react';
import './SearchPanel.css';

export default function SearchPanel() {
    return (
        <div className="search-panel">
            <div className="search-header">
                <h3>Search</h3>
            </div>
            <div className="search-content">
                <input type="text" placeholder="Search" className="search-input" />
                <input type="text" placeholder="Replace" className="search-input" />
                <button className="search-btn">Find All</button>
            </div>
            <div className="search-info">
                (Global search functionality is not yet implemented)
            </div>
        </div>
    );
}