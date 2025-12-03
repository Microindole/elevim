import { EventEmitter } from 'events';
import { ICliService } from '../../shared/api-contract';

export class CliService extends EventEmitter implements ICliService {
    // 这是一个纯粹的事件发射器
    // 在 index.ts 中解析完 CLI 参数后，调用 cliService.emit(...)
}