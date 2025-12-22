import React from 'react';
import { SectionProps } from '../SettingsRegistry';
import { PRESET_THEMES } from "../../../../../../shared/themes";

const AppearanceSection: React.FC<SectionProps> = ({ settings, onSave }) => {
    // 合并内置主题和用户自定义主题
    const allThemes = {
        ...PRESET_THEMES,
        ...(settings.customThemes || {})
    };

    // 辅助函数：判断当前主题名
    const getCurrentThemeName = () => {
        // 这里只是一个简单的判断逻辑，实际可能需要更严谨的比对
        // 假设 settings.theme.colors 与某个预设主题匹配
        // 由于这里我们直接存的是 colors 对象，反向查找名字比较耗时，
        // 建议 settings 结构中最好直接存 themeName。
        // 既然原有代码是通过对象比较或者没有存名字，这里仅做 UI 展示逻辑适配：
        for (const [name, colors] of Object.entries(allThemes)) {
            if (JSON.stringify(colors) === JSON.stringify(settings.theme.colors)) {
                return name;
            }
        }
        return 'Custom';
    };

    const currentThemeName = getCurrentThemeName();

    return (
        <div className="setting-group">
            <h3>Theme</h3>
            <div className="theme-grid">
                {Object.entries(allThemes).map(([name, colors]) => (
                    <div
                        key={name}
                        className={`theme-card ${currentThemeName === name ? 'active' : ''}`}
                        onClick={() => {
                            onSave('theme', {
                                mode: 'dark', // 暂时写死，或者根据 colors 推断
                                colors: colors
                            });
                        }}
                    >
                        <div className="theme-preview" style={{ background: colors.background }}>
                            <div className="theme-preview-sidebar" style={{ background: colors.gutterBackground }}></div>
                            <div className="theme-preview-text">
                                <span style={{ color: colors.keyword }}>const</span>{' '}
                                <span style={{ color: colors.function }}>main</span>{' '}
                                <span style={{ color: colors.foreground }}>=</span> ...
                            </div>
                        </div>
                        <span className="theme-name">{name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AppearanceSection;