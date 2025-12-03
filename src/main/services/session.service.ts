import { ISessionService } from '../../shared/api-contract';
import { getEditorSession, saveEditorSession } from '../lib/session';
import { FileService } from './file.service';

export class SessionService implements ISessionService {
    constructor(private fileService: FileService) {}

    async getSession() {
        return getEditorSession();
    }

    async saveSession(session: any) {
        saveEditorSession(session);
        // 同步文件夹状态给 FileService
        if (session.currentFolderPath) {
            this.fileService.setCurrentFolder(session.currentFolderPath);
        }
    }
}