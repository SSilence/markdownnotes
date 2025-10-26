import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';

interface NewsItem {
    title: string;
    summary: string;
    url: string;
    timestamp: number;
}

@Component({
    selector: 'app-page-show-news',
    imports: [CommonModule, CdsModule],
    template: `
        @if (newsItems && newsItems.length > 0) {
            <div class="news-container">
                @for (item of newsItems; track item.url) {
                    <a [href]="item.url" target="_blank" class="news-item">
                        <div class="news-header">
                            <h3 class="news-title">{{ item.title }}</h3>
                            <span class="news-date">{{ formatDate(item.timestamp) }}</span>
                        </div>
                        <p class="news-summary">{{ item.summary }}</p>
                        <span class="news-url">{{ shortenUrl(item.url) }}</span>
                    </a>
                }
            </div>
        } @else {
            <p class="no-news">Keine Nachrichten verfügbar.</p>
        }
    `,
    styles: [`
        .news-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            margin-top: 1rem;
        }

        .news-item {
            display: block;
            padding: 0.75rem;
            padding-top: 1.5rem;
            border-bottom: 1px solid #e0e0e0;
            text-decoration: none;
            color: inherit;
            transition: background-color 0.2s ease;
        }

        .news-item:hover {
            background-color: #f5f5f5;
        }

        .news-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
        }

        .news-title {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: #333;
            line-height: 1.3;
            flex: 1;
        }

        .news-date {
            font-size: 0.75rem;
            color: #999;
            white-space: nowrap;
        }

        .news-summary {
            margin: 0 0 0.5rem 0;
            color: #666;
            line-height: 1.5;
            font-size: 0.85rem;
        }

        .news-url {
            display: block;
            font-size: 0.7rem;
            color: #aaa;
        }

        .no-news {
            text-align: center;
            color: #999;
            padding: 2rem;
            font-style: italic;
        }

        @media (max-width: 768px) {
            .news-container {
                grid-template-columns: 1fr;
            }
        }
    `]
})
export class PageShowNewsComponent implements OnChanges {
    @Input() content: string = '';
    
    newsItems: NewsItem[] = [];

    ngOnChanges(): void {
        this.parseNewsContent();
    }

    private parseNewsContent(): void {
        if (!this.content) {
            this.newsItems = [];
            return;
        }

        try {
            // Extract JSON from content (it should be the content after the separator)
            const jsonMatch = this.content.match(/\[([\s\S]*)\]/);
            if (jsonMatch) {
                this.newsItems = JSON.parse(jsonMatch[0]);
                // Sort by timestamp, newest first
                this.newsItems.sort((a, b) => b.timestamp - a.timestamp);
            } else {
                this.newsItems = [];
            }
        } catch (error) {
            console.error('Error parsing news content:', error);
            this.newsItems = [];
        }
    }

    formatDate(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Vor wenigen Minuten';
        } else if (diffInHours < 24) {
            return `Vor ${diffInHours} Stunde${diffInHours !== 1 ? 'n' : ''}`;
        } else if (diffInHours < 48) {
            return 'Gestern';
        } else {
            return date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    shortenUrl(url: string): string {
        const maxLength = 60;
        if (url.length <= maxLength) {
            return url;
        }
        
        // Remove protocol
        let shortened = url.replace(/^https?:\/\//, '');
        
        if (shortened.length <= maxLength) {
            return shortened;
        }
        
        // Shorten to maxLength and add ellipsis
        return shortened.substring(0, maxLength - 3) + '...';
    }
}
