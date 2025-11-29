// src/renderer/features/editor/lib/breadcrumbs-util.ts
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

export interface BreadcrumbItem {
    type: 'file' | 'dir' | 'symbol';
    name: string;
    kind?: string; // 用于区分 class, function, interface 等，未来可用于显示不同图标
    startPos?: number;
}

// 定义我们需要识别的节点类型及其名称子节点
// 不同的语言解析器 (Lezer) 使用的节点名称略有不同
const SYMBOL_QTYS = new Set([
    // JavaScript / TypeScript
    "FunctionDeclaration", "FunctionExpression", "ArrowFunction", "MethodDeclaration",
    "ClassDeclaration", "ClassExpression", "InterfaceDeclaration", "TypeAliasDeclaration",
    "VariableDeclaration", "Property",
    // Python
    "FunctionDefinition", "ClassDefinition",
    // CSS / SCSS
    "RuleSet", "MediaStatement", "KeyframesStatement"
]);

/**
 * 获取当前光标位置的符号路径
 */
export function getSymbolPath(state: EditorState): BreadcrumbItem[] {
    // 获取光标位置
    const pos = state.selection.main.head;
    const tree = syntaxTree(state);
    const symbols: BreadcrumbItem[] = [];

    // 从光标位置向上遍历语法树
    // resolveInner(pos, -1) 会倾向于在这个位置结束之前的节点，这通常符合直觉
    let node = tree.resolveInner(pos, -1);

    while (node) {
        if (SYMBOL_QTYS.has(node.name)) {
            let name = "Unknown";
            let kind = node.name;

            // 尝试查找节点名称
            // Lezer 树通常将名称放在特定的子节点中，如 VariableName, PropertyName, Definition 等
            const nameNode =
                node.getChild("VariableName") ||
                node.getChild("PropertyName") ||
                node.getChild("Definition") ||
                node.getChild("TypeName") ||
                node.getChild("Label"); // CSS class names often end up here or similar

            if (nameNode) {
                name = state.sliceDoc(nameNode.from, nameNode.to);
            } else if (node.name === 'RuleSet') {
                // CSS 规则集特殊处理，尝试获取选择器文本
                const selector = node.getChild("Selector") || node.getChild("Tag"); // 根据具体 CSS parser 调整
                if (selector) {
                    name = state.sliceDoc(selector.from, selector.to);
                } else {
                    // 兜底：取第一行的一小段
                    const text = state.sliceDoc(node.from, Math.min(node.to, node.from + 20));
                    name = text.split('{')[0].trim() || 'Rule';
                }
                kind = "class"; // 复用样式
            }

            // 只有找到了名字或者是匿名函数才添加
            if (name !== "Unknown") {
                symbols.unshift({
                    type: 'symbol',
                    name: name,
                    kind: kind,
                    startPos: node.from
                });
            }
        }
        node = node.parent!;
    }

    return symbols;
}