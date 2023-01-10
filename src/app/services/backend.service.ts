import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { Page } from './../models/page';
import { tap, switchMap, map } from 'rxjs/operators';
import { PageDto } from '../components/dtos/page-dto';
import { ToRenameDto } from '../components/dtos/to-rename-dto';
import { FileDto } from '../components/dtos/file-dto';

@Injectable()
export class BackendService {

    static readonly PASSWORD_PAGE_ID: string = 'password_page_storage';

    static readonly ID_SEPARATOR: string = '___';
    static readonly BASE_URL: string = 'api/';

    pages: Page[] = [];

    pagesChanged = new BehaviorSubject<Page[]>([]);

    constructor(private http: HttpClient) {
    }

    getAllPages(): Observable<Page[]> {
        return this.http.get<PageDto[]>(BackendService.BASE_URL + 'page')
                        .pipe(
                            map(pagedtos => pagedtos.filter(dto => dto.id !== BackendService.PASSWORD_PAGE_ID )),
                            map(pagedtos => pagedtos.sort((p1, p2) => p1.id!.localeCompare(p2.id!)).map(pagedto => new Page(pagedto))),
                            map(pages => this.convertToNestedTree(pages)),
                            tap(pages => this.pages = pages),
                            tap(pages => this.pagesChanged.next(pages))
                        );
    }

    getAllPagesFlatten(): Page[] {
        return this.flattenPages(this.pages);
    }

    getPage(id: string): Observable<Page> {
        return this.getAllPages().pipe(
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

    search(q: string): Observable<Page[]> {
        const params = new HttpParams()
            .set('q', q ? q : '');
        return this.http.get<PageDto[]>(BackendService.BASE_URL + 'search', { params: params })
                        .pipe(
                            map(pagedtos => pagedtos.filter(dto => dto.id !== BackendService.PASSWORD_PAGE_ID )),
                            map(pagedtos => pagedtos.sort((p1, p2) => p1.id!.localeCompare(p2.id!)).map(pagedto => new Page(pagedto)))
                        );
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
