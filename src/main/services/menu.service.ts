import { EventEmitter } from 'events';
import { IMenuService } from '../../shared/api-contract';
import { FileService } from './file.service';

export class MenuService extends EventEmitter implements IMenuService {
    constructor(private fileService: FileService) {
        super();
    }

    async triggerNewFile(): Promise<void> {
        // 重置当前文件状态
        this.fileService.setCurrentFile(null);
        // 通知前端
        this.emit('new-file'); // 注意：这里发出的事件叫 'new-file'
        // 前端监听器在 FileService 上，我们需要统一。
        // 根据 api-contract，on('new-file') 是在 IFileService 上定义的。
        // 为了简单起见，我们可以让 FileService 监听 MenuService，或者直接在 FileService 里发。
        // 这里我们采用简单的转发：MenuService 收到请求 -> 转发给 FileService 处理 -> FileService 发事件
        // 但由于我们现在是 RPC，前端直接调用的 triggerNewFile。
        // 所以前端调用 triggerNewFile -> 后端处理 -> 后端 emit 'new-file'。
        // 为了保持一致性，我们可以让 FileService 来 emit 这个事件。
        this.fileService.emit('new-file');
    }

    async triggerSaveFile(): Promise<void> {
        this.emit('trigger-save');
    }

    async triggerSaveAsFile(): Promise<void> {
        this.fileService.setCurrentFile(null);
        this.emit('trigger-save');
    }
}