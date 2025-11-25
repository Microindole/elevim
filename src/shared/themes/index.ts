import { EditorColors } from "../types";
import { OneDark } from "./one-dark";
import { Dracula } from "./dracula";
import { Monokai } from "./monokai";
import {GithubDark} from "./github-dark";
import {SolarizedDark} from "./solarized-dark";
import {Nord} from "./nord";
import {TokyoNight} from "./tokyo-night";
import {Origin} from "./origin";

// 导出默认主题（供主进程使用）
export const DEFAULT_THEME = Origin;

// 导出主题列表（供渲染进程设置面板使用）
export const PRESET_THEMES: Record<string, EditorColors> = {
    'Origin': Origin,
    'One Dark': OneDark,
    'Dracula': Dracula,
    'Monokai': Monokai,
    'GithubDark': GithubDark,
    'SolarizedDark': SolarizedDark,
    'Nord': Nord,
    'TokyoNight': TokyoNight,
};