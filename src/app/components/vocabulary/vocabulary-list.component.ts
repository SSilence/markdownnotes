import { Component, HostListener, inject, OnInit, ViewChild, ViewChildren } from "@angular/core";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { switchMap, map, tap, concatMap, catchError, finalize } from 'rxjs/operators';
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { from, of, timer } from "rxjs";
import { AlertComponent } from "../shared/alert.component";
import { VocabularyImageComponent } from "./vocabulary-image.component";

@Component({
    selector: 'app-vocabulary-list',
    imports: [
        AlertComponent,
        ClarityModule,
        CommonModule,
        FormsModule,
        RouterModule,
        VocabularyImageComponent
    ],
    template: `
        @if (loading) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>

        @if (page) {
        
            @if (successSave) {
                <app-alert message="successfully saved" [sticky]="true" [type]="'success'"></app-alert>
            }
            <div class="flex justify-between items-center">
                <h1 class="text-4xl font-bold !m-0">{{page.title}}</h1>
                <div class="flex gap-2 items-center">
                    @if (successSave) {
                        <span class="text-green-600 font-medium">successfully saved</span>
                    }
                    <button class="btn btn-outline" (click)="add()">add</button>
                    <button class="btn" [ngClass]="{'btn-success': successSave, 'btn-primary': !successSave}" (click)="saveClick()">save</button>
                </div>
            </div>
            <div class="flex gap-4">
                <div class="w-32 flex-shrink-0">
                    <clr-input-container>
                        <input clrInput class="w-full" placeholder="search" [(ngModel)]="q" (ngModelChange)="filterSearch()" />
                    </clr-input-container>
                    <h4 class="text-xs font-semibold mt-3 mb-2">Phase</h4>
                    @for (i of [0,1,2,3,4,5,6]; track i) {
                        <clr-checkbox-wrapper>
                            <label>{{i}}</label>
                            <input clrCheckbox type="checkbox" (change)="filterPhase(i)" [checked]="phase.includes(i)" />
                        </clr-checkbox-wrapper>
                    }
                    <h4 class="text-xs font-semibold mt-3 mb-2">Section</h4>
                    @for (sec of sections; track sec) {
                        <clr-checkbox-wrapper>
                            <label>{{sec}}</label>
                            <input clrCheckbox type="checkbox" (change)="filterSection(sec)" [checked]="section.includes(sec)" />
                        </clr-checkbox-wrapper>
                    }
                </div>
                <div class="flex-1">
                    <div class="overflow-x-auto">
                        <table class="table w-full">
                            <thead>
                                <tr>
                                    <th class="text-left"><span>German</span></th>
                                    <th class="text-left">English</th>
                                    <th class="text-left">Section</th>
                                    <th class="text-left">Phase</th>
                                    <th class="text-center">Score</th>
                                    <th class="text-center">Image</th>
                                    <th class="text-left"></th>
                                </tr>
                            </thead>
                            <tbody>
                                @if (toAdd) {
                                    <tr class="border-b-4 border-green-500">
                                        <td class="!p-0"><input type="text" [(ngModel)]="toAdd.german" (keydown)="onAddKeypress($event)" #addGermanInput class="w-full border-0 m-0 p-3"></td>
                                        <td class="!p-0"><input type="text" [(ngModel)]="toAdd.english" (keydown)="onAddKeypress($event)" class="w-full border-0 m-0 p-3"></td>
                                        <td class="!p-0"><input type="text" [(ngModel)]="toAdd.section" (keydown)="onAddKeypress($event)" class="w-full border-0 m-0 p-3"></td>
                                        <td class="!p-0"></td>
                                        <td class="!p-0"></td>
                                        <td class="!p-0"></td>
                                        <td class="!p-0 text-left">
                                            <button class="btn btn-primary" (click)="addSave()">add</button>
                                            <button class="btn btn-outline" (click)="toAdd=null">cancel</button>
                                        </td>
                                    </tr>
                                }
                                @for (entry of selected; track entry) {
                                    <tr>
                                        <td class="!p-0"><input type="text" [(ngModel)]="entry.german" class="w-full border-0 !m-0 p-3"></td>
                                        <td class="!p-0"><input type="text" [(ngModel)]="entry.english" class="w-full border-0 m-0 p-3"></td>
                                        <td class="!p-0"><input type="text" [(ngModel)]="entry.section" class="w-full border-0 m-0 p-3"></td>
                                        <td class="!p-0 text-left !pl-3 !pt-2">
                                            {{entry.g2ePhase}} &rarr;<br />
                                            {{entry.e2gPhase}} &larr;
                                        </td>
                                        <td [title]="entry.example" class="text-center !p-3"
                                            [ngStyle]="{
                                            'color': 'rgb(' + (230 - 10 * (entry.score||0)) + ',0,' + (230 - 10 * (entry.score||0)) + ')',
                                            'font-weight': 300 + 40 * (entry.score||0)
                                            }">
                                            {{entry.score}}
                                        </td>
                                        <td class="text-center !p-2.5">
                                            @if(canManageImage(entry)) {
                                                <cds-icon shape="image" 
                                                    [class.text-success]="hasImage(entry)"
                                                    class="cursor-pointer text-gray-300"
                                                    title="Image available"
                                                    (click)="openImageModal(entry)"></cds-icon>
                                            }
                                        </td>
                                        <td class="!p-0 !pt-1 text-left">
                                            <audio #audio></audio>
                                            <button type="button" class="btn btn-icon btn-sm btn-link" (click)="audio.src=playUrl(entry.english);audio.play()">
                                                <cds-icon shape="play"></cds-icon>
                                            </button>
                                            <button type="button" class="btn btn-icon btn-sm btn-link" (click)="reset(entry)">
                                                <cds-icon shape="refresh" direction="down"></cds-icon>
                                            </button>
                                            <button type="button" class="btn btn-icon btn-sm btn-link" (click)="delete(entry)">
                                                <cds-icon shape="trash"></cds-icon>
                                            </button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="flex justify-center mt-4">
                        <table class="border border-gray-300">
                            <tr>
                                @for (page of pages; track page) {
                                    <td (click)="selectPage(page)" [ngClass]="{'bg-gray-300': currentPage==page, 'bg-white': currentPage!=page}" class="border border-gray-300 px-3 py-1 cursor-pointer hover:bg-gray-100">{{page}}</td>
                                }
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        }

        @if (imageModalEntry) {
            <div class="fixed inset-0 bg-black/60 z-40" aria-hidden="true"></div>
            <div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-hidden="true">
                <div class="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
                    <div class="flex items-center justify-between p-4 ">
                        <h3 class="!m-0 text-lg font-semibold">Image</h3>
                        <button aria-label="Close" class="close" type="button" (click)="cancelImageModal()" [disabled]="imageModalSaving || imageModalComponent?.isBusy()">
                            <cds-icon aria-hidden="true" shape="close"></cds-icon>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 pt-0">
                        <app-vocabulary-image
                            [vocabulary]="imageModalVocabulary ?? ''"
                            (imageUpdated)="onVocabularyImageUpdated($event)">
                        </app-vocabulary-image>
                    </div>
                    <div class="flex justify-end gap-2 p-4 border-gray-300">
                        <button class="btn btn-outline" type="button" (click)="cancelImageModal()" [disabled]="imageModalSaving || imageModalComponent?.isBusy()">cancel</button>
                        <button class="btn btn-danger" type="button" (click)="saveImageModal()" [disabled]="imageModalSaving || imageModalComponent?.isBusy() || !imageModalComponent?.hasPendingChanges()">save</button>
                    </div>
                </div>
            </div>
        }
    `,
})
export class VocabularyListComponent implements OnInit {

    page: Page | null = null;
    error: any = null;
    loading: boolean = false;
    vocabulary: VocabularyEntry[] = [];
    selected: VocabularyEntry[] = [];
    selectedCount = 0;
    
    q: string = "";
    phase: number[] = [];
    section: string[] = [];
    currentPage: number = 1;
    itemsPerPage = 100;

    toAdd: VocabularyEntry | null = null;

    successSave: boolean = false;
    
    imagePresence: Record<string, boolean> = {};
    imageModalEntry: VocabularyEntry | null = null;
    imageModalVocabulary: string | null = null;
    imageModalSaving: boolean = false;

    hasImage(entry: VocabularyEntry): boolean {
        const key = this.vocabularyKeyFromEntry(entry);
        return key.length > 0 && this.imagePresence[key] === true;
    }

    canManageImage(entry: VocabularyEntry): boolean {
        return this.vocabularyKeyFromEntry(entry).length > 0;
    }

    get sections(): string[] {
        return structuredClone(this.vocabulary)
                                .map(v => v.section)
                                .filter((value, index, array) => array.indexOf(value) === index)
                                .reverse();
    }

    get pages(): number[] {
        const length = Math.ceil(this.selectedCount / this.itemsPerPage);
        return Array.from({length: length}, (_, i) => i + 1);
    }

    @ViewChildren('addGermanInput') addGermanInput: any;
    @ViewChild(VocabularyImageComponent) imageModalComponent?: VocabularyImageComponent;

    private backendService = inject(BackendService);
    private route = inject(ActivatedRoute);

    ngOnInit(): void {
        this.route.params.pipe(
            map(params => params['id']),
            tap(_ => {
                this.page = null;
                this.loading = true;
                this.imagePresence = {};
                this.cancelImageModal();
            }),
            switchMap(id => this.backendService.getPage(id)),
            tap(_ => this.loading = false)
        ).subscribe({
            next: page => {
                this.page = page;
                this.vocabulary = VocabularyEntry.parseVocabulary(this.page!!.content).reverse();
                this.refresh();
                this.fetchImagePresence();
            },
            error: error => { this.error = error; this.loading = false; }
        });
    }

    @HostListener('document:keydown.control.s', ['$event'])
    onCtrlSKey(event: Event): void {
        this.save(() => this.enrich());
        (event as KeyboardEvent).preventDefault();
    }

    add() {
        this.clearFilters();
        this.toAdd = new VocabularyEntry();
        if (this.vocabulary.length>0) {
            this.toAdd.section = this.vocabulary[0].section;
        }
        setTimeout(() => this.addGermanInput.last.nativeElement.focus(), 400);
    }

    onAddKeypress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.addSave();
        }
    }

    addSave() {
        this.vocabulary.unshift(this.toAdd!);
        this.add();
        this.refresh();
        this.save(() => this.enrich());
    }

    private enrich() {
        const itemsToUpdate = this.vocabulary.filter(item => item.score < 0 || item.score > 10);
        from(itemsToUpdate).pipe(
            concatMap(item =>
                this.backendService.getVocabularyEnrich(item.german, item.english).pipe(
                    map(response => {
                        item.score = response.score;
                        item.example = response.example;
                    }),
                    catchError(() => of(null))
                )
            )
        ).subscribe({
            next: () => {
                this.save();
            }
        });
    }

    clearFilters() {
        this.q = "";    
        this.phase = [];
        this.section = [];
        this.currentPage = 1;
        this.refresh();
    }

    filterSearch() {
        this.toAdd = null;
        this.currentPage = 1;
        this.refresh();
    }

    filterPhase(phase: number) {
        this.toAdd = null;
        if(this.phase.includes(phase)) {
            this.phase = this.phase.filter(item => item != phase);
        } else {
            this.phase.push(phase);
        }
        this.currentPage = 1;
        this.refresh();
    }

    filterSection(section: string) {
        this.toAdd = null;
        if(this.section.includes(section)) {
            this.section = this.section.filter(item => item != section);
        } else {
            this.section.push(section);
        }
        this.currentPage = 1;
        this.refresh();
    }

    selectPage(page: number) {
        this.toAdd = null;
        this.currentPage = page;
        this.refresh();
    }

    refresh() {
        const startIndex = (this.currentPage-1)*this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const filtered = this.vocabulary.filter(item => {
            const qMatch = this.q.length > 3 ? item.german.toLowerCase().includes(this.q.toLowerCase()) || item.english.toLowerCase().includes(this.q.toLowerCase()) : true;
            const phaseMatch = this.phase.length > 0 ? this.phase.includes(item.e2gPhase) || this.phase.includes(item.g2ePhase) : true;
            const sectionMatch = this.section.length > 0 ? this.section.includes(item.section) : true;
            return qMatch && phaseMatch && sectionMatch;  
        });
        this.selectedCount = filtered.length;
        this.selected = filtered.slice(startIndex, endIndex);
    }

    openImageModal(entry: VocabularyEntry) {
        const key = this.vocabularyKeyFromEntry(entry);
        if (key.length === 0) {
            return;
        }
        this.imageModalSaving = false;
        this.imageModalEntry = entry;
        this.imageModalVocabulary = key;
    }

    cancelImageModal() {
        this.imageModalComponent?.cancelChanges();
        this.closeImageModalInternal();
    }

    saveImageModal() {
        const component = this.imageModalComponent;
        if (!component) {
            this.closeImageModalInternal();
            return;
        }
        if (!component.hasPendingChanges()) {
            this.closeImageModalInternal();
            return;
        }
        this.imageModalSaving = true;
        component.saveChanges().pipe(
            finalize(() => this.imageModalSaving = false)
        ).subscribe({
            next: () => {
                this.fetchImagePresence();
                this.closeImageModalInternal();
            },
            error: () => {
                // keep dialog open, component displays error
            }
        });
    }

    private closeImageModalInternal() {
        this.imageModalEntry = null;
        this.imageModalVocabulary = null;
        this.imageModalSaving = false;
    }

    onVocabularyImageUpdated(hasImage: boolean) {
        if (!this.imageModalEntry) {
            return;
        }
        if (this.imageModalVocabulary) {
            this.imagePresence[this.imageModalVocabulary] = hasImage;
        }
        const currentKey = this.vocabularyKeyFromEntry(this.imageModalEntry);
        if (currentKey.length > 0) {
            this.imagePresence[currentKey] = hasImage;
        }
    }

    private fetchImagePresence(): void {
        const keys = Array.from(new Set(this.vocabulary
            .map(entry => this.vocabularyKeyFromEntry(entry))
            .filter(key => key.length > 0)));

        if (keys.length === 0) {
            this.imagePresence = {};
            return;
        }

        this.backendService.getVocabularyImagePresence(keys).subscribe({
            next: presence => {
                const updated: Record<string, boolean> = {};
                keys.forEach(key => {
                    updated[key] = presence ? presence[key] === true : false;
                });
                this.imagePresence = updated;
            },
            error: () => {
                // ignore presence errors to keep editing flow smooth
            }
        });
    }

    private vocabularyKeyFromEntry(entry: VocabularyEntry): string {
        const english = (entry.english ?? '').trim();
        if (english.length > 0) {
            return english;
        }
        const german = (entry.german ?? '').trim();
        if (german.length > 0) {
            return german;
        }
        return '';
    }

    saveClick() {
        this.save(() => this.enrich());
    }
    
    save(finished?: () => any) {
        this.page!!.content = JSON.stringify(structuredClone(this.vocabulary).reverse(), null, 4);
        this.backendService.savePage(this.page!!).subscribe({
            next: () => {
                this.successSave = true;
                timer(3000).subscribe(() => this.successSave = false);
                this.fetchImagePresence();
                finished?.();
            },
            error: error => { this.error = error; }
        });
    }

    delete(entry: VocabularyEntry) {
        const key = this.vocabularyKeyFromEntry(entry);
        const index = this.vocabulary.indexOf(entry);
        this.vocabulary.splice(index, 1);
        if (key.length > 0) {
            delete this.imagePresence[key];
        }
        if (this.imageModalEntry === entry) {
            this.cancelImageModal();
        }
        this.refresh();
    }

    reset(entry: VocabularyEntry) {
        entry.e2gNext = null;
        entry.e2gPhase = 0;
        entry.g2eNext = null;
        entry.g2ePhase = 0;
    }

    playUrl(word: String): string {
        const base = document.querySelector('base')!!.getAttribute('href');
        return `${base}api/api/text2speech?text=${word}`;
    }
}
