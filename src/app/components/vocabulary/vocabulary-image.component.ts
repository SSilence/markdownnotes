import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ClarityModule } from "@clr/angular";
import { HttpClient } from "@angular/common/http";
import { BackendService } from "src/app/services/backend.service";
import { Subject, Observable, of, throwError } from "rxjs";
import { debounceTime, switchMap, takeUntil, catchError, finalize, map, tap } from "rxjs/operators";

type PendingAction = "none" | "select" | "remove";

@Component({
    selector: "app-vocabulary-image",
    standalone: true,
    imports: [
        ClarityModule,
        CommonModule,
        FormsModule
    ],
    template: `
        <div class="w-full h-full flex flex-col gap-3">
            @if (previewImageUrl) {
                <div class="flex flex-1 flex-col gap-3 items-center justify-center">
                    <img [src]="previewImageUrl" [alt]="vocabulary" class="w-[60vh] h-[60vh] object-cover" />
                    <div class="flex justify-center gap-3">
                        @if (canRemoveImage) {
                            <button type="button" class="btn btn-danger-outline btn-sm inline-flex items-center gap-1" (click)="removeImage()" [disabled]="isBusy()" [attr.title]="removeButtonTitle">
                                <cds-icon shape="trash"></cds-icon>
                                <span>{{ removeButtonLabel }}</span>
                            </button>
                        }
                    </div>
                </div>
            } @else {
                <div class="flex flex-1 flex-col gap-3 w-full min-h-0">
                    <input
                        id="vocabulary-image-search-{{instanceId}}"
                        type="text"
                        placeholder="Search images"
                        [(ngModel)]="searchTerm"
                        (ngModelChange)="onSearchTermChange($event)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md font-base bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    <div class="flex flex-col gap-3 flex-1 min-h-0">
                        @if (loadingSuggestions) {
                            <div class="flex items-center gap-2 text-sm text-gray-700">
                                <span class="spinner spinner-sm spinner-inline"></span>
                                <span>Searching for images...</span>
                            </div>
                        }

                        @if (errorMessage) {
                            <div class="text-sm text-red-700">
                                {{ errorMessage }}
                            </div>
                        }

                        @if (!loadingSuggestions && suggestions.length === 0 && !errorMessage) {
                            <div class="text-sm text-gray-600">
                                No matching images found. Adjust your search.
                            </div>
                        }

                        <div class="grid grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto pr-1" [class.opacity-60]="selectionProcessing || saving" [class.pointer-events-none]="selectionProcessing || saving">
                            @for (url of suggestions; track url) {
                                <button type="button" class="overflow-hidden rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" (click)="selectImage(url)" [disabled]="selectionProcessing || saving">
                                    <img [src]="url" alt="Image suggestion" class="w-full h-full object-cover" />
                                </button>
                            }
                        </div>
                    </div>

                    @if (selectionProcessing) {
                        <div class="flex items-center gap-2 text-sm text-blue-600">
                            <span class="spinner spinner-sm spinner-inline"></span>
                            <span>Preparing image...</span>
                        </div>
                    }

                    @if (saving) {
                        <div class="flex items-center gap-2 text-sm text-blue-600">
                            <span class="spinner spinner-sm spinner-inline"></span>
                            <span>Saving image...</span>
                        </div>
                    }
                </div>
            }
            @if (removalPlanned) {
                <div class="text-sm text-gray-600 italic">
                    Image will be removed after saving.
                </div>
            }
        </div>
    `
})
export class VocabularyImageComponent implements OnInit, OnChanges, OnDestroy {

    @Input() vocabulary: string = "";
    @Output() imageUpdated = new EventEmitter<boolean>();

    private readonly backend = inject(BackendService);
    private readonly http = inject(HttpClient);

    searchTerm: string = "";
    suggestions: string[] = [];
    loadingSuggestions = false;
    selectionProcessing = false;
    saving = false;
    errorMessage: string | null = null;

    private initialImageUrl: string | null = null;
    private initialSearchTerm: string = "";
    private pendingAction: PendingAction = "none";
    private pendingImageBase64: string | null = null;
    private pendingPreviewUrl: string | null = null;

    private readonly search$ = new Subject<string>();
    private readonly destroy$ = new Subject<void>();
    readonly instanceId = Math.floor(Math.random() * 100000);

    ngOnInit(): void {
        this.setupSearchSubscription();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["vocabulary"] && typeof this.vocabulary === "string") {
            const trimmed = this.vocabulary.trim();
            this.initialSearchTerm = trimmed;
            this.searchTerm = trimmed;
            this.refreshServerState();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get previewImageUrl(): string | null {
        if (this.pendingAction === "select" && this.pendingPreviewUrl) {
            return this.pendingPreviewUrl;
        }
        if (this.pendingAction === "remove") {
            return null;
        }
        return this.initialImageUrl;
    }

    get removalPlanned(): boolean {
        return this.pendingAction === "remove";
    }

    get canRemoveImage(): boolean {
        return this.initialImageUrl !== null || this.pendingAction === "select";
    }

    get removeButtonLabel(): string {
        if (this.pendingAction === "remove") {
            return "keep image";
        }
        if (this.pendingAction === "select") {
            return "clear selection";
        }
        return "delete image";
    }

    get removeButtonTitle(): string {
        const label = this.removeButtonLabel;
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    hasPendingChanges(): boolean {
        return this.pendingAction !== "none";
    }

    isBusy(): boolean {
        return this.selectionProcessing || this.saving;
    }

    cancelChanges(): void {
        this.searchTerm = this.initialSearchTerm;
        this.resetPendingChanges();
        this.onSearchTermChange(this.searchTerm);
    }

    onSearchTermChange(term: string): void {
        const trimmedTerm = (term ?? "").trim();
        this.errorMessage = null;
        this.search$.next(trimmedTerm);
    }

    selectImage(url: string): void {
        if (!this.vocabulary || this.isBusy()) {
            return;
        }
        this.selectionProcessing = true;
        this.errorMessage = null;

        this.fetchImageAsBase64(url).pipe(
            finalize(() => this.selectionProcessing = false),
            takeUntil(this.destroy$)
        ).subscribe({
            next: base64 => {
                this.planSelection(url, base64);
            },
            error: () => {
                this.errorMessage = "Could not prepare image.";
            }
        });
    }

    removeImage(): void {
        if (this.isBusy()) {
            return;
        }
        this.errorMessage = null;

        if (this.pendingAction !== "none") {
            this.resetPendingChanges();
            return;
        }
        if (this.initialImageUrl) {
            this.pendingAction = "remove";
            this.pendingImageBase64 = null;
            this.pendingPreviewUrl = null;
        }
    }

    saveChanges(): Observable<'none' | 'select' | 'remove'> {
        if (!this.hasPendingChanges()) {
            return of("none");
        }

        if (this.pendingAction === "select" && !this.pendingImageBase64) {
            this.errorMessage = "Image is not ready to save.";
            return throwError(() => new Error("pending image missing"));
        }

        this.saving = true;
        const action = this.pendingAction;
        const request$ = action === "select"
            ? this.backend.uploadVocabularyImage(this.vocabulary, this.pendingImageBase64!)
            : this.backend.deleteVocabularyImage(this.vocabulary);

        return request$.pipe(
            switchMap(() => this.backend.getVocabularyImagePresence([this.vocabulary])),
            map(mapPresence => mapPresence[this.vocabulary] === true),
            tap(hasImage => {
                this.initialImageUrl = hasImage ? this.buildImageUrl() : null;
                this.resetPendingChanges();
                if (!hasImage) {
                    this.onSearchTermChange(this.searchTerm);
                }
                this.imageUpdated.emit(hasImage);
            }),
            map(() => action),
            catchError(err => {
                this.errorMessage = action === "remove"
                    ? "Could not remove image."
                    : "Could not save image.";
                this.saving = false;
                return throwError(() => err);
            }),
            finalize(() => {
                this.saving = false;
            })
        );
    }

    private refreshServerState(): void {
        const vocab = this.vocabulary.trim();
        if (!vocab) {
            this.initialImageUrl = null;
            this.resetPendingChanges();
            return;
        }
        this.backend.getVocabularyImagePresence([vocab]).pipe(
            takeUntil(this.destroy$),
            tap(() => this.errorMessage = null),
            catchError(() => {
                this.errorMessage = "Could not load image status.";
                return of({ [vocab]: false });
            })
        ).subscribe(mapPresence => {
            const hasImage = mapPresence[vocab] === true;
            this.initialImageUrl = hasImage ? this.buildImageUrl() : null;
            this.resetPendingChanges(false);
            if (!hasImage && this.errorMessage === null) {
                this.onSearchTermChange(this.searchTerm);
            }
            this.imageUpdated.emit(hasImage);
        });
    }

    private resetPendingChanges(clearErrors: boolean = true): void {
        this.pendingAction = "none";
        this.pendingImageBase64 = null;
        this.pendingPreviewUrl = null;
        this.selectionProcessing = false;
        if (clearErrors) {
            this.errorMessage = null;
        }
    }

    private planSelection(previewUrl: string, base64: string): void {
        this.pendingAction = "select";
        this.pendingPreviewUrl = previewUrl;
        this.pendingImageBase64 = base64;
    }

    private buildImageUrl(): string {
        return `${this.backend.getVocabularyImageUrl(this.vocabulary)}?t=${Date.now()}`;
    }

    private setupSearchSubscription(): void {
        this.search$.pipe(
            takeUntil(this.destroy$),
            debounceTime(300),
            switchMap(term => {
                if (!term) {
                    this.loadingSuggestions = false;
                    return of<string[]>([]);
                }
                this.loadingSuggestions = true;
                this.errorMessage = null;
                return this.backend.getVocabularyImages(term).pipe(
                    catchError(() => {
                        this.errorMessage = "Image search failed.";
                        return of<string[]>([]);
                    }),
                    finalize(() => this.loadingSuggestions = false)
                );
            })
        ).subscribe(urls => {
            this.suggestions = urls;
        });
    }

    private fetchImageAsBase64(url: string): Observable<string> {
        return this.http.get(url, { responseType: "blob" }).pipe(
            switchMap(blob => new Observable<string>(observer => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = typeof reader.result === "string" ? reader.result : "";
                    const base64 = result.includes(",") ? result.split(",")[1] : result;
                    observer.next(base64);
                    observer.complete();
                };
                reader.onerror = () => {
                    observer.error("failed");
                };
                reader.readAsDataURL(blob);
                return () => reader.abort();
            }))
        );
    }
}
