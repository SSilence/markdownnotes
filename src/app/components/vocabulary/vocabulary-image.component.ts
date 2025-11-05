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
        <div class="vocabulary-image-card">
            @if (previewImageUrl) {
                <div class="current-image">
                    <img [src]="previewImageUrl" [alt]="vocabulary" />
                    <div class="current-image-actions">
                        @if (canRemoveImage) {
                            <button type="button" class="btn btn-danger-outline btn-sm current-image-delete" (click)="removeImage()" [disabled]="isBusy()" [attr.title]="removeButtonTitle">
                                <cds-icon shape="trash"></cds-icon>
                                <span>{{ removeButtonLabel }}</span>
                            </button>
                        }
                    </div>
                </div>
            } @else {
                <div class="selector">
                    <input
                        id="vocabulary-image-search-{{instanceId}}"
                        class="search-input"
                        type="text"
                        placeholder="Search images"
                        [(ngModel)]="searchTerm"
                        (ngModelChange)="onSearchTermChange($event)"
                    />

                    @if (loadingSuggestions) {
                        <div class="state">
                            <span class="spinner spinner-sm spinner-inline"></span>
                            <span>Searching for images...</span>
                        </div>
                    }

                    @if (errorMessage) {
                        <div class="state error">
                            {{ errorMessage }}
                        </div>
                    }

                    @if (!loadingSuggestions && suggestions.length === 0 && !errorMessage) {
                        <div class="state empty">
                            No matching images found. Adjust your search.
                        </div>
                    }

                    <div class="suggestions" [class.loading]="selectionProcessing || saving">
                        @for (url of suggestions; track url) {
                            <button type="button" class="suggestion" (click)="selectImage(url)" [disabled]="selectionProcessing || saving">
                                <img [src]="url" alt="Image suggestion" />
                            </button>
                        }
                    </div>

                    @if (selectionProcessing) {
                        <div class="state uploading">
                            <span class="spinner spinner-sm spinner-inline"></span>
                            <span>Preparing image...</span>
                        </div>
                    }

                    @if (saving) {
                        <div class="state uploading">
                            <span class="spinner spinner-sm spinner-inline"></span>
                            <span>Saving image...</span>
                        </div>
                    }
                </div>
            }
            @if (removalPlanned) {
                <div class="state notice">
                    Image will be removed after saving.
                </div>
            }
        </div>
    `,
    styles: [`
        :host {
            display: block;
            width: 100%;
        }

        .vocabulary-image-card {
            padding: 0;
            width: 100%;
        }

        .current-image {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
        }

        .current-image img {
            width: 100%;
            max-height: 60vh;
            object-fit: contain;
        }

        .no-image {
            border: 1px dashed #c9c9c9;
            padding: 1.5rem;
            text-align: center;
            color: #666;
            font-style: italic;
        }

        .selector {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
        }

        .search-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid #c9c9c9;
            border-radius: 4px;
            font-size: 1rem;
            background: #fff;
        }

        .search-input:focus {
            outline: none;
            border-color: #0b5fff;
            box-shadow: 0 0 0 2px rgba(11, 95, 255, 0.15);
        }

        .current-image-actions {
            display: flex;
            justify-content: center;
            gap: 0.75rem;
        }

        .current-image-delete {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            text-transform: lowercase;
        }

        .current-image-delete cds-icon {
            width: 1rem;
            height: 1rem;
        }

        .selector button.suggestion {
            width: 100%;
        }

        .state {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: #555;
        }

        .state.error {
            color: #b20000;
        }

        .state.empty {
            color: #666;
        }

        .state.notice {
            color: #666;
            font-style: italic;
        }

        .suggestions {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.75rem;
            max-height: 18rem;
            overflow-y: auto;
            padding-right: 0.25rem;
        }

        .suggestions.loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .suggestion {
            padding: 0;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 6px;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .suggestion:hover,
        .suggestion:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .suggestion img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
        }

        .uploading {
            color: #0b5fff;
        }
    `]
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
