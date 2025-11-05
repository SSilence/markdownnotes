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
            <div class="grid grid-cols-2 max-md:grid-cols-1">
                @for (item of newsItems; track item.url) {
                    <a [href]="item.url" target="_blank" class="block p-3 pt-2 border-b border-border-default no-underline text-inherit transition-colors duration-200 hover:bg-bg-hover">
                        <span class="text-[0.6rem] text-text-muted whitespace-nowrap flex-shrink-0">{{ formatDate(item.timestamp) }}</span>
                        <h4 class="!m-0 !mt-1 text-sm font-semibold text-text-primary leading-[1.3] flex-1">{{ item.title }}</h4>
                        <p class="!m-0 !mt-2 text-text-secondary leading-[1.5] text-[0.85rem]">{{ item.summary }}</p>
                        <span class="block text-[0.7rem] text-text-subtle mt-2">{{ shortenUrl(item.url) }}</span>
                    </a>
                }
            </div>
        } @else {
            <p class="text-center text-text-muted p-8 italic">No news available.</p>
        }
    `
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
            return 'a few minutes ago';
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 48) {
            return 'yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
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
