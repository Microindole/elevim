// src/renderer/features/workbench/commands/types.ts
import { CommandId } from "../../../../shared/types";

// 定义命令的处理函数类型
export type CommandHandler = () => void | Promise<void>;

// 定义命令注册表：Key 是命令 ID，Value 是具体的函数实现
export type CommandRegistry = Partial<Record<CommandId, CommandHandler>>;