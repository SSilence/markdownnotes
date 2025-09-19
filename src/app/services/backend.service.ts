import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { Page } from './../models/page';
import { tap, switchMap, map } from 'rxjs/operators';
import { PageDto } from '../dtos/page-dto';
import { ToRenameDto } from '../dtos/to-rename-dto';
import { FileDto } from '../dtos/file-dto';
import { EnrichResponse } from '../dtos/enrich-response';
import { FolderDto } from '../dtos/folder-dto';
import { MessageDto, SendEmailDto } from '../dtos/message-dto';

@Injectable()
export class BackendService {

    static readonly PASSWORD_PAGE_ID: string = 'password_page_storage';
    static readonly VOCABULARY_PAGE_ID: string = 'vocabulary_page_storage';

    static readonly ID_SEPARATOR: string = '___';
    static readonly BASE_URL: string = 'api/';

    pages: Page[] = [];

    pagesChanged = new BehaviorSubject<Page[]>([]);

    constructor(private http: HttpClient) {
    }

    getAllPages(): Observable<Page[]> {
        return this.http.get<PageDto[]>(BackendService.BASE_URL + 'page')
                        .pipe(
                            map(pagedtos => pagedtos.sort((p1, p2) => p1.id!.localeCompare(p2.id!)).map(pagedto => new Page(pagedto))),
                            map(pages => this.convertToNestedTree(pages)),
                            tap(pages => this.pages = pages),
                            tap(pages => this.pagesChanged.next(pages))
                        );
    }

    getAllPagesFlatten(): Page[] {
        return this.flattenPages(this.filterSystemPages(this.pages));
    }

    filterSystemPages(pages: Page[]): Page[] {
        return pages.filter(page => page.id !== BackendService.VOCABULARY_PAGE_ID && page.id !== BackendService.PASSWORD_PAGE_ID);
    }

    getPage(id: string): Observable<Page> {
        const observable = this.pages.length == 0 ? this.getAllPages() : of([]);
        return observable.pipe(
            switchMap(() => this.http.get<PageDto>(BackendService.BASE_URL + 'page/' + id)),
            map(pagedto => new Page(pagedto)),
            map(page => {
                const p = this.findPage(this.pages, page);
                p!.content = page.content;
                return p!;
            })
        );
    }

    savePage(page: Page): Observable<Page> {
        const newid = this.getPageId(page);
        if (page.id != null && newid != page.id) {
            return this.renamePage(this.renamePageAndChildrenPages(page)).pipe(
                switchMap(() => this.http.post<void>(BackendService.BASE_URL + 'page', new PageDto(page))),
                switchMap(() => this.getAllPages()),
                map(() => page)
            );
        } else {
            page.id = newid;
            return this.http.post<void>(BackendService.BASE_URL + 'page', new PageDto(page)).pipe(
                switchMap(() => this.getAllPages()),
                map(() => page)
            );
        }
    }

    deletePage(page: Page): Observable<Page[]> {
        if (page.children && page.children.length > 0) {
            return throwError(() => 'page has child pages, move or delete them');
        }
        return this.http.delete<void>(BackendService.BASE_URL + 'page/' + page.id)
                        .pipe(
                            switchMap(() => this.getAllPages())
                        );
    }

    renamePage(toRenameDtos: ToRenameDto[]): Observable<void> {
        return this.http.post<void>(BackendService.BASE_URL + 'page/rename', toRenameDtos);
    }

    search(q: string): Observable<Page[]> {
        const params = new HttpParams()
            .set('q', q ? q : '');
        return this.http.get<PageDto[]>(BackendService.BASE_URL + 'search', { params: params })
                        .pipe(
                            map(pagedtos => pagedtos.filter(dto => dto.id !== BackendService.PASSWORD_PAGE_ID )),
                            map(pagedtos => pagedtos.sort((p1, p2) => p1.id!.localeCompare(p2.id!)).map(pagedto => new Page(pagedto)))
                        );
    }




    getAllFiles(): Observable<FileDto[]> {
        return this.http.get<FileDto[]>(BackendService.BASE_URL + 'file');
    }

    deleteFile(id: string): Observable<void> {
        return this.http.delete<void>(BackendService.BASE_URL + 'file/' + id);
    }

    saveFile(path: string, file: File): Observable<void> {
        const formData = new FormData();
        formData.append('file', file, path);
        return this.http.post<void>(BackendService.BASE_URL + 'file', formData);
    }

    getFileAsString(file: string): Observable<string> {
        return this.http.get<string>(file, {responseType: 'text' as 'json'});
    }

    

    
    getPasswordPage(): Observable<Page> {
        return this.http.get<PageDto>(BackendService.BASE_URL + 'page/' + BackendService.PASSWORD_PAGE_ID).pipe(
            map(pagedto => new Page(pagedto))
        );
    }

    savePasswordPage(page: Page): Observable<void> {
        page.id = BackendService.PASSWORD_PAGE_ID
        page.title = BackendService.PASSWORD_PAGE_ID;
        return this.http.post<void>(BackendService.BASE_URL + 'page', new PageDto(page));
    }




    getVocabularyPage(): Observable<Page> {
        return this.http.get<PageDto>(BackendService.BASE_URL + 'page/' + BackendService.VOCABULARY_PAGE_ID).pipe(
            map(pagedto => new Page(pagedto))
        );
    }

    getAllVocabularyPages(): Observable<Page[]> {
        return this.http.get<PageDto[]>(BackendService.BASE_URL + 'page')
            .pipe(
                map(pagedtos => pagedtos.map(pagedto => new Page(pagedto))),
                map(pages => this.convertToNestedTree(pages)),
                map(pages => {
                    const vocabularyPages = pages.filter(page => page.id === BackendService.VOCABULARY_PAGE_ID)
                    return vocabularyPages.length > 0 ? vocabularyPages[0].children : [];
                })
            );
    }
    
    createVocabularyParentPage(): Observable<void> {
        const page = new Page();
        page.id = BackendService.VOCABULARY_PAGE_ID;
        page.title = BackendService.VOCABULARY_PAGE_ID;
        return this.http.post<void>(BackendService.BASE_URL + 'page', new PageDto(page));
    }

    getVocabularyEnrich(german: string, english: string): Observable<EnrichResponse> {
        const params = new HttpParams()
            .set('german', german ? german : '')
            .set('english', english ? english : '');
        return this.http.get<EnrichResponse>(BackendService.BASE_URL + 'vocabulary/enrich', { params: params });
    }

    
    isImapEnabled(): Observable<boolean> {
        return this.http.get<{enabled: boolean}>(BackendService.BASE_URL + 'imap/enabled').pipe(
            map(response => response.enabled)
        );
    }

    getImapFolders(): Observable<FolderDto[]> {
        return this.http.get<FolderDto[]>(BackendService.BASE_URL + 'imap/folders')
            .pipe(
                map(folders => folders.map(folder => new FolderDto(folder)))
            );
    }

    getImapMessages(folder: string, limit?: number, start?: number, order?: string): Observable<MessageDto[]> {
        let params = new HttpParams();
        if (limit !== undefined) {
            params = params.set('limit', limit.toString());
        }
        if (start !== undefined) {
            params = params.set('start', start.toString());
        }
        if (order) {
            params = params.set('order', order);
        }

        return this.http.get<MessageDto[]>(BackendService.BASE_URL + 'imap/folder/' + encodeURIComponent(folder), { params: params })
            .pipe(
                map(messages => messages.map(message => new MessageDto(message)))
            );
    }

    getImapMessage(folder: string, messageId: number): Observable<MessageDto> {
        return this.http.get<MessageDto>(BackendService.BASE_URL + 'imap/message/' + encodeURIComponent(folder) + '/' + messageId)
            .pipe(
                map(message => new MessageDto(message))
            );
    }

    sendEmail(emailData: SendEmailDto): Observable<{success: boolean}> {
        // Check if there are attachments
        if (emailData.attachments && emailData.attachments.length > 0) {
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add text fields
            formData.append('to', emailData.to);
            formData.append('subject', emailData.subject);
            formData.append('message', emailData.message);
            if (emailData.cc) formData.append('cc', emailData.cc);
            if (emailData.bcc) formData.append('bcc', emailData.bcc);
            if (emailData.replyTo) formData.append('replyTo', emailData.replyTo);
            
            // Add all attachments as regular attachments
            // Draft attachments are already loaded as File objects in the frontend
            emailData.attachments.forEach((file, index) => {
                formData.append(`attachment_${index}`, file, file.name);
                console.log('Attachment added:', file.name, 'size:', file.size);
            });
            
            // Debug: Show FormData contents (keys method might not be available in all browsers)
            const formDataKeys: string[] = [];
            formData.forEach((value, key) => formDataKeys.push(key));
            console.log('Sending FormData with keys:', formDataKeys);
            
            return this.http.post<{success: boolean}>(BackendService.BASE_URL + 'imap/send', formData);
        } else {
            // No attachments, send as JSON
            return this.http.post<{success: boolean}>(BackendService.BASE_URL + 'imap/send', emailData);
        }
    }

    saveDraft(emailData: SendEmailDto, draftId?: string): Observable<{success: boolean, draftId: string, message: string}> {
        // Always send drafts as JSON - attachments are not saved in drafts
        const draftData = { 
            to: emailData.to,
            subject: emailData.subject,
            message: emailData.message,
            cc: emailData.cc,
            bcc: emailData.bcc,
            replyTo: emailData.replyTo,
            draftId: draftId
            // Note: attachments are intentionally excluded from drafts
        };
        return this.http.post<{success: boolean, draftId: string, message: string}>(BackendService.BASE_URL + 'imap/draft', draftData);
    }

    deleteDraft(draftId: string): Observable<{success: boolean, message: string}> {
        return this.http.delete<{success: boolean, message: string}>(BackendService.BASE_URL + 'imap/draft/' + encodeURIComponent(draftId));
    }

    moveEmail(messageId: number, sourceFolder: string, targetFolder: string): Observable<{success: boolean}> {
        return this.http.post<{success: boolean}>(BackendService.BASE_URL + 'imap/move', {
            messageId: messageId,
            sourceFolder: sourceFolder,
            targetFolder: targetFolder
        });
    }

    purgeFolder(folder: string): Observable<{success: boolean}> {
        return this.http.post<{success: boolean}>(BackendService.BASE_URL + 'imap/purge', {
            folder: folder
        });
    }

    markEmail(messageId: number, folder: string, seen: boolean): Observable<{success: boolean, seen: boolean}> {
        return this.http.post<{success: boolean, seen: boolean}>(BackendService.BASE_URL + 'imap/mark', {
            messageId: messageId,
            folder: folder,
            seen: seen
        });
    }

    getImapContacts(limit?: number): Observable<{email: string, name: string, type: string, count: number}[]> {
        let params = new HttpParams();
        if (limit !== undefined) {
            params = params.set('limit', limit.toString());
        }
        return this.http.get<{email: string, name: string, type: string, count: number}[]>(BackendService.BASE_URL + 'imap/contacts', { params: params });
    }

    getAttachmentUrl(folder: string, messageId: number, attachmentIndex: number): string {
        return BackendService.BASE_URL + 'imap/attachment/' + 
               encodeURIComponent(folder) + '/' + 
               messageId + '/' + 
               attachmentIndex;
    }

    viewAttachment(folder: string, messageId: number, attachmentIndex: number): void {
        const url = this.getAttachmentUrl(folder, messageId, attachmentIndex);
        // Open in new tab/window to view content inline instead of downloading
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    private findPage(pages: Page[], page: Page): Page | null {
        if (!pages) {
            return null;
        }
        let found = pages.find(p => p.id == page.id);
        if (found) {
            return found;
        }
        for (let p of pages) {
            let found = this.findPage(p.children, page);
            if (found) {
                return found;
            }
        }
        return null;
    }

    private flattenPages(pages: Page[]): Page[] {
        let result: Page[] = [];
        for (let page of pages) {
            result.push(page);
            for (let child of page.children) {
                result.push(child);
                if (child.children && child.children.length > 0) {
                    result = result.concat(this.flattenPages(child.children));
                }
            }
        }
        return result;
    }

    private convertToNestedTree(pages: Page[]): Page[] {
        const root = [];
        for (const page of pages) {
            const ids = page.id!.split(BackendService.ID_SEPARATOR);
            if (ids.length == 1) {
                root.push(page);
            } else {
                const parentId = ids.slice(0, -1).join(BackendService.ID_SEPARATOR);
                const parent = pages.find(p => p.id == parentId);
                if (parent) {
                    parent.children.push(page);
                    page.parent = parent;
                } else {
                    root.push(page);
                }
            }
        }
        return root;
    }

    private renamePageAndChildrenPages(page: Page): ToRenameDto[] {
        const oldid = page.id;
        page.id = this.getPageId(page);
        let toRenameDtos = [ new ToRenameDto(oldid!, page.id) ];
        if (page.children) {
            for (const child of page.children) {
                toRenameDtos = toRenameDtos.concat(this.renamePageAndChildrenPages(child));
            }
        }
        return toRenameDtos;
    }

    private getPageId(page: Page): string {
        const id = page.title!.toLowerCase().trim().replace(/[^a-z0-9_\.]/gi,'');
        if (page.parent != null) {
            return this.getPageId(page.parent) + BackendService.ID_SEPARATOR + id;
        }
        return id;
    }

}
