import { Component, EventEmitter, Input, Output, inject, ViewChild, ElementRef, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { FormsModule } from '@angular/forms';
import { IconService } from 'src/app/services/icon.service';

@Component({
    selector: 'app-icon-dialog',
    imports: [
        CommonModule,
        CdsModule,
        FormsModule
    ],
    template: `
        @if (isOpen) {
            <div class="modal selectIconDialog">
                <div class="modal-dialog modal-xl" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="search-container">
                            <input #searchInput 
                                   type="text" 
                                   class="clr-input" 
                                   placeholder="Search icons..." 
                                   [(ngModel)]="iconSearchTerm"
                                   autofocus>
                        </div>
                        <div class="icons-container">
                            @for (icon of getFilteredIcons(); track icon) {
                                <cds-icon class="selectIcon" [attr.shape]="icon" size="24" (click)="selectIcon(icon)" [title]="icon"></cds-icon>
                            }
                            @if (getFilteredIcons().length === 0) {
                                <div class="no-results">No icons found matching "{{iconSearchTerm}}"</div>
                            }
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" type="button" (click)="closeDialog()">Close</button>
                    </div>
                </div>
                </div>
            </div>
        }

        @if (isOpen) {
            <div class="modal-backdrop" aria-hidden="true"></div>
        }
    `,
    styles: [`
        .selectIcon  {
            cursor: pointer;
            margin:0.2em;
        }

        .search-container {
            margin-bottom: 1em;
        }

        .search-container input {
            width: 100%;
            font-size: 1rem;
            margin: 0;
        }

        .icons-container {
            height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 1em;
            border-radius: 4px;
        }

        .no-results {
            text-align: center;
            padding: 2em;
            color: #666;
            font-style: italic;
        }

        .modal-content {
            min-height: 500px;
        }

        .modal-body {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
    `]
})
export class IconDialogComponent implements AfterViewInit, OnChanges {
    private _isOpen = false;
    
    @Input() 
    get isOpen(): boolean {
        return this._isOpen;
    }
    set isOpen(value: boolean) {
        this._isOpen = value;
        if (value) {
            this.iconSearchTerm = '';
            setTimeout(() => {
                this.focusSearchInput();
            }, 200);
        }
    }

    @Input() currentIcon = 'file';
    @Output() iconSelected = new EventEmitter<string>();
    @Output() dialogClosed = new EventEmitter<void>();

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    iconSearchTerm = '';
    public iconService = inject(IconService);

    ngAfterViewInit() {
        this.focusSearchInput();
    }

    ngOnChanges() {
        if (this.isOpen) {
            // Use a longer timeout to ensure the DOM is fully rendered
            setTimeout(() => {
                this.focusSearchInput();
            }, 100);
        }
    }

    private focusSearchInput() {
        if (this.isOpen && this.searchInput?.nativeElement) {
            this.searchInput.nativeElement.focus();
        }
    }

    closeDialog() {
        this.dialogClosed.emit();
    }

    selectIcon(icon: string) {
        this.iconSelected.emit(icon);
        this.closeDialog();
    }

    getFilteredIcons(): string[] {
        if (!this.iconSearchTerm.trim()) {
            return this.iconService.icons;
        }

        const searchTerm = this.iconSearchTerm.toLowerCase().trim();
        
        return this.iconService.icons.filter(icon => {
            // Search by icon name
            if (icon.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Search by metadata/categories
            const metadata = this.getIconMetadata(icon);
            return metadata.some(meta => meta.toLowerCase().includes(searchTerm));
        });
    }

    private getIconMetadata(icon: string): string[] {
        // Add metadata/categories for better searchability
        const iconMetadata: { [key: string]: string[] } = {
            'file': ['document', 'text', 'content'],
            'folder': ['directory', 'container', 'organize'],
            'home': ['house', 'start', 'main'],
            'user': ['person', 'profile', 'account'],
            'settings': ['config', 'options', 'preferences'],
            'star': ['favorite', 'bookmark', 'important'],
            'heart': ['love', 'like', 'favorite'],
            'search': ['find', 'look', 'magnify'],
            'plus': ['add', 'create', 'new'],
            'minus': ['remove', 'delete', 'subtract'],
            'edit': ['modify', 'change', 'pencil'],
            'trash': ['delete', 'remove', 'bin'],
            'download': ['save', 'get', 'import'],
            'upload': ['send', 'export', 'share'],
            'email': ['mail', 'message', 'contact'],
            'phone': ['call', 'telephone', 'mobile'],
            'calendar': ['date', 'time', 'schedule'],
            'clock': ['time', 'timer', 'watch'],
            'camera': ['photo', 'picture', 'image'],
            'image': ['photo', 'picture', 'media'],
            'video': ['movie', 'film', 'media'],
            'music': ['audio', 'sound', 'song'],
            'lock': ['secure', 'private', 'protected'],
            'unlock': ['open', 'access', 'public'],
            'key': ['password', 'access', 'security'],
            'shield': ['protection', 'security', 'safe'],
            'warning': ['alert', 'caution', 'danger'],
            'error': ['problem', 'issue', 'bug'],
            'success': ['check', 'ok', 'complete'],
            'info': ['information', 'help', 'details'],
            'question': ['help', 'support', 'faq'],
            'tag': ['label', 'category', 'mark'],
            'bookmark': ['save', 'favorite', 'mark'],
            'link': ['url', 'connection', 'external'],
            'copy': ['duplicate', 'clone', 'reproduce'],
            'paste': ['insert', 'add', 'place'],
            'cut': ['move', 'remove', 'extract'],
            'print': ['paper', 'output', 'document'],
            'refresh': ['reload', 'update', 'sync'],
            'sync': ['synchronize', 'update', 'refresh'],
            'cloud': ['online', 'storage', 'backup', 'weather', 'sky'],
            'wifi': ['network', 'internet', 'connection'],
            'bluetooth': ['wireless', 'connection', 'device'],
            'battery': ['power', 'energy', 'charge'],
            'volume': ['sound', 'audio', 'speaker'],
            'microphone': ['audio', 'record', 'voice'],
            'headphones': ['audio', 'listen', 'sound'],
            'monitor': ['screen', 'display', 'computer'],
            'mobile': ['phone', 'smartphone', 'device'],
            'tablet': ['device', 'ipad', 'touch'],
            'laptop': ['computer', 'notebook', 'portable'],
            'desktop': ['computer', 'pc', 'workstation'],
            'server': ['database', 'hosting', 'backend'],
            'database': ['data', 'storage', 'records'],
            'code': ['programming', 'development', 'script'],
            'terminal': ['console', 'command', 'cli'],
            'bug': ['error', 'problem', 'issue'],
            'wrench': ['tool', 'fix', 'repair'],
            'hammer': ['tool', 'build', 'construct'],
            'gear': ['settings', 'config', 'mechanical'],
            'chart': ['graph', 'statistics', 'data'],
            'graph': ['chart', 'analytics', 'statistics'],
            'table': ['data', 'grid', 'spreadsheet'],
            'list': ['items', 'menu', 'index'],
            'grid': ['layout', 'organize', 'structure'],
            'layout': ['design', 'structure', 'format'],
            'map': ['location', 'navigation', 'geography'],
            'compass': ['direction', 'navigation', 'travel'],
            'car': ['vehicle', 'transport', 'automobile'],
            'plane': ['aircraft', 'travel', 'flight'],
            'train': ['transport', 'railway', 'travel'],
            'ship': ['boat', 'vessel', 'transport'],
            'bicycle': ['bike', 'cycle', 'transport'],
            'shopping-cart': ['cart', 'buy', 'purchase', 'store'],
            'store': ['shop', 'market', 'retail'],
            'money': ['cash', 'currency', 'financial'],
            'credit-card': ['payment', 'finance', 'card'],
            'bank': ['financial', 'money', 'institution'],
            'piggy-bank': ['savings', 'money', 'finance'],
            'gift': ['present', 'reward', 'surprise'],
            'trophy': ['award', 'winner', 'achievement'],
            'medal': ['award', 'achievement', 'honor'],
            'certificate': ['diploma', 'achievement', 'document'],
            'education': ['school', 'learning', 'study'],
            'book': ['read', 'literature', 'study'],
            'library': ['books', 'study', 'research'],
            'graduation-cap': ['education', 'degree', 'academic'],
            'school': ['education', 'learning', 'academic'],
            'briefcase': ['work', 'business', 'professional'],
            'building': ['office', 'structure', 'architecture'],
            'factory': ['industrial', 'manufacturing', 'production'],
            'hospital': ['medical', 'health', 'care'],
            'medical': ['health', 'doctor', 'hospital'],
            'pill': ['medicine', 'drug', 'health'],
            'thermometer': ['temperature', 'health', 'weather'],
            'sun': ['weather', 'bright', 'day'],
            'moon': ['night', 'dark', 'lunar'],
            'rain': ['weather', 'water', 'precipitation'],
            'snow': ['weather', 'winter', 'cold'],
            'tree': ['nature', 'plant', 'environment'],
            'flower': ['nature', 'plant', 'bloom'],
            'leaf': ['nature', 'plant', 'green'],
            'flame': ['fire', 'hot', 'energy'],
            'lightbulb': ['idea', 'innovation', 'bright'],
            'flash': ['lightning', 'quick', 'fast'],
            'target': ['aim', 'goal', 'objective'],
            'flag': ['country', 'nation', 'marker'],
            'pin': ['location', 'mark', 'attach'],
            'paperclip': ['attach', 'clip', 'office'],
            'scissors': ['cut', 'tool', 'edit'],
            'ruler': ['measure', 'tool', 'length', 'scale', 'distance'],
            'calculator': ['math', 'compute', 'numbers'],
            'keyboard': ['input', 'type', 'computer'],
            'mouse': ['pointer', 'click', 'computer'],
            'gamepad': ['game', 'controller', 'play'],
            'dice': ['game', 'random', 'chance'],
            'puzzle': ['game', 'solve', 'challenge'],
            'magic-wand': ['magic', 'tool', 'transform'],
            'paint-brush': ['art', 'creative', 'design'],
            'palette': ['color', 'art', 'design'],
            'image-gallery': ['photos', 'pictures', 'collection'],
            'album': ['collection', 'music', 'photos'],
            'playlist': ['music', 'collection', 'songs'],
            'repeat': ['loop', 'cycle', 'again'],
            'shuffle': ['random', 'mix', 'order'],
            'pause': ['stop', 'break', 'halt'],
            'play': ['start', 'begin', 'run'],
            'stop': ['end', 'halt', 'cease'],
            'fast-forward': ['skip', 'advance', 'speed'],
            'rewind': ['back', 'reverse', 'previous'],
            'record': ['capture', 'save', 'document'],
            'eject': ['remove', 'disconnect', 'out'],
            'power': ['on', 'off', 'energy'],
            'reload': ['refresh', 'restart', 'update'],
            'undo': ['reverse', 'back', 'cancel'],
            'redo': ['forward', 'again', 'repeat'],
            'archive': ['store', 'backup', 'compress'],
            'extract': ['unzip', 'decompress', 'get'],
            'import': ['load', 'input', 'bring'],
            'export': ['save', 'output', 'send'],
            'share': ['send', 'distribute', 'social'],
            'rss': ['feed', 'news', 'subscribe'],
            'notification': ['alert', 'message', 'bell'],
            'bell': ['alert', 'notification', 'sound'],
            'megaphone': ['announce', 'loud', 'broadcast'],
            'chat': ['message', 'talk', 'conversation'],
            'comment': ['message', 'feedback', 'note'],
            'thumbs-up': ['like', 'approve', 'good'],
            'thumbs-down': ['dislike', 'disapprove', 'bad'],
            'eye': ['view', 'see', 'watch'],
            'eye-hide': ['hidden', 'invisible', 'private'],
            'visible': ['show', 'see', 'display'],
            'invisible': ['hide', 'hidden', 'secret'],
            'filter': ['sort', 'organize', 'select'],
            'sort': ['order', 'arrange', 'organize'],
            'expand': ['grow', 'enlarge', 'open'],
            'collapse': ['shrink', 'close', 'fold'],
            'fullscreen': ['maximize', 'expand', 'large'],
            'minimize': ['shrink', 'reduce', 'small'],
            'resize': ['scale', 'adjust', 'change'],
            'move': ['relocate', 'drag', 'position'],
            'rotate': ['turn', 'spin', 'angle'],
            'flip': ['mirror', 'reverse', 'turn'],
            'crop': ['cut', 'trim', 'adjust'],
            'zoom-in': ['magnify', 'enlarge', 'closer'],
            'zoom-out': ['reduce', 'shrink', 'farther'],
            'angle': ['degree', 'corner', 'measurement'],
            'cursor': ['pointer', 'select', 'click'],
            'hand': ['grab', 'drag', 'move'],
            'crosshair': ['target', 'aim', 'precise'],
            'pipette': ['color', 'sample', 'pick'],
            'text': ['type', 'font', 'write'],
            'font': ['text', 'typography', 'style'],
            'bold': ['strong', 'thick', 'emphasis'],
            'italic': ['slant', 'emphasis', 'style'],
            'underline': ['line', 'emphasis', 'style'],
            'strikethrough': ['cross', 'cancel', 'delete'],
            'align-left': ['left', 'justify', 'text'],
            'align-center': ['center', 'middle', 'text'],
            'align-right': ['right', 'justify', 'text'],
            'indent': ['tab', 'space', 'margin'],
            'outdent': ['untab', 'reduce', 'margin'],
            'bullet-list': ['list', 'items', 'points'],
            'number-list': ['ordered', 'numbered', 'sequence'],
            'quote': ['citation', 'reference', 'text'],
            'syntax': ['code', 'format', 'structure'],
            'variable': ['code', 'data', 'programming'],
            'function': ['code', 'method', 'programming'],
            'class': ['code', 'object', 'programming'],
            'package': ['bundle', 'library', 'module'],
            'namespace': ['scope', 'group', 'organization'],
            'interface': ['contract', 'api', 'definition'],
            'enum': ['list', 'options', 'values'],
            'struct': ['structure', 'data', 'type'],
            'union': ['combine', 'merge', 'type'],
            'array': ['list', 'collection', 'data'],
            'object': ['entity', 'thing', 'data'],
            'string': ['text', 'characters', 'data'],
            'number': ['digit', 'numeric', 'data'],
            'boolean': ['true', 'false', 'logic'],
            'null': ['empty', 'void', 'nothing'],
            'undefined': ['unknown', 'missing', 'void'],
            'infinity': ['endless', 'unlimited', 'forever'],
            'nan': ['invalid', 'error', 'not-number'],
            'regex': ['pattern', 'match', 'search'],
            'json': ['data', 'format', 'structure'],
            'xml': ['markup', 'data', 'structure'],
            'html': ['web', 'markup', 'page'],
            'css': ['style', 'design', 'appearance'],
            'javascript': ['js', 'script', 'programming'],
            'typescript': ['ts', 'typed', 'javascript'],
            'python': ['py', 'script', 'programming'],
            'java': ['programming', 'enterprise', 'object'],
            'c': ['programming', 'system', 'native'],
            'cpp': ['c++', 'programming', 'object'],
            'csharp': ['c#', 'dotnet', 'microsoft'],
            'php': ['web', 'server', 'scripting'],
            'ruby': ['rb', 'scripting', 'web'],
            'go': ['golang', 'google', 'concurrent'],
            'rust': ['system', 'safe', 'fast'],
            'swift': ['ios', 'apple', 'mobile'],
            'kotlin': ['android', 'jvm', 'mobile'],
            'sql': ['database', 'query', 'data'],
            'markdown': ['md', 'text', 'format'],
            'yaml': ['config', 'data', 'format'],
            'toml': ['config', 'data', 'format'],
            'ini': ['config', 'settings', 'format'],
            'csv': ['data', 'spreadsheet', 'table'],
            'log': ['record', 'history', 'debug'],
            'readme': ['documentation', 'info', 'help'],
            'license': ['legal', 'permission', 'rights'],
            'gitignore': ['git', 'ignore', 'exclude'],
            'dockerfile': ['docker', 'container', 'deploy'],
            'makefile': ['build', 'compile', 'automation'],
            'package-json': ['npm', 'dependencies', 'config'],
            'tsconfig': ['typescript', 'config', 'build'],
            'webpack': ['bundle', 'build', 'module'],
            'babel': ['transform', 'compile', 'javascript'],
            'eslint': ['lint', 'quality', 'javascript'],
            'prettier': ['format', 'style', 'code'],
            'jest': ['test', 'unit', 'javascript'],
            'cypress': ['test', 'e2e', 'automation'],
            'storybook': ['component', 'ui', 'documentation'],
            'figma': ['design', 'ui', 'prototype'],
            'sketch': ['design', 'ui', 'vector'],
            'photoshop': ['image', 'edit', 'design'],
            'illustrator': ['vector', 'design', 'art'],
            'indesign': ['layout', 'print', 'design'],
            'after-effects': ['motion', 'animation', 'video'],
            'premiere': ['video', 'edit', 'timeline'],
            'blender': ['3d', 'model', 'animation'],
            'unity': ['game', 'engine', '3d'],
            'unreal': ['game', 'engine', 'graphics'],
            'godot': ['game', 'engine', 'indie'],
            'steam': ['game', 'platform', 'store'],
            'discord': ['chat', 'gaming', 'community'],
            'slack': ['chat', 'work', 'team'],
            'teams': ['chat', 'microsoft', 'meeting'],
            'zoom': ['video', 'meeting', 'call'],
            'skype': ['video', 'call', 'chat'],
            'whatsapp': ['chat', 'message', 'mobile'],
            'telegram': ['chat', 'secure', 'message'],
            'twitter': ['social', 'tweet', 'news'],
            'facebook': ['social', 'network', 'friends'],
            'instagram': ['photo', 'social', 'visual'],
            'linkedin': ['professional', 'network', 'career'],
            'youtube': ['video', 'streaming', 'content'],
            'twitch': ['streaming', 'gaming', 'live'],
            'netflix': ['streaming', 'video', 'entertainment'],
            'spotify': ['music', 'streaming', 'audio'],
            'apple-music': ['music', 'streaming', 'apple'],
            'amazon': ['shopping', 'cloud', 'aws'],
            'google': ['search', 'cloud', 'services'],
            'microsoft': ['windows', 'office', 'cloud'],
            'adobe': ['creative', 'design', 'software'],
            'github': ['git', 'code', 'repository'],
            'gitlab': ['git', 'code', 'devops'],
            'bitbucket': ['git', 'code', 'atlassian'],
            'jira': ['project', 'management', 'agile'],
            'confluence': ['wiki', 'documentation', 'team'],
            'trello': ['board', 'project', 'kanban'],
            'asana': ['project', 'task', 'team'],
            'notion': ['notes', 'database', 'workspace'],
            'evernote': ['notes', 'capture', 'organize'],
            'onenote': ['notes', 'microsoft', 'digital'],
            'dropbox': ['cloud', 'storage', 'sync'],
            'onedrive': ['cloud', 'microsoft', 'storage'],
            'google-drive': ['cloud', 'google', 'storage'],
            'icloud': ['cloud', 'apple', 'storage']
        };

        return iconMetadata[icon] || [];
    }
}