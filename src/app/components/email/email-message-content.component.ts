import { Component, Input, computed, signal, Signal, ViewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import DOMPurify from 'dompurify';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-email-message-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #emailContent class="email-content">
      @if (message && message.bodyHtml) {
        <iframe
          #emailFrame
          [src]="htmlContentUrl"
          frameborder="0"
          sandbox="allow-popups"
          class="email-iframe"
          [style.height]="iframeHeight()">
        </iframe>
      } @else if (message && message.bodyText) {
        <div class="email-text-content">
          <pre>{{ getSanitizedText() }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .email-content {
      width: 100%;
    }

    .email-iframe {
      width: 100%;
      border: none;
      overflow: hidden;
      padding: 0 1rem 0 1rem;
    }

    .email-text-content {
      width: 100%;
      padding: 0;
      background: #fff;
      border-radius: 4px;
    }

    .email-text-content pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      color: #333;
      border: none;
      padding: 1rem;
    }
  `]
})
export class EmailMessageContentComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() message: MessageDto | null = null;
  @Input() folder: string = '';
  @Input() loadImages: boolean = false;
  @Output() loadImagesChange = new EventEmitter<boolean>();
  @Input() headerAreaHeightInPx: number = 0;

  @ViewChild('emailContent', { static: false }) emailContent!: ElementRef<HTMLDivElement>;

  htmlContentUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');

  private headerHeightSignal = signal(0);

  iframeHeight = computed(() => `calc(100vh - var(--clr-header-height) - ${this.headerHeightSignal()}px)`);

  constructor(private sanitizer: DomSanitizer, private backendService: BackendService) {}

  ngAfterViewInit() {
    if (this.message?.bodyHtml) {
      this.updateIframeContent();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['headerAreaHeightInPx']) {
      this.headerHeightSignal.set(this.headerAreaHeightInPx);
    }
    if (this.message?.bodyHtml) {
      this.updateIframeContent();
    }
  }

  private sanitizedContent(rawContent: string): string {
    let filteredContent = rawContent.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    // remove all Data-URLs except data:image/*
    filteredContent = filteredContent.replace(/src=["']data:((?!image)[^"']*)["']/gi, 'src=""');

    const cleanHtml = DOMPurify.sanitize(filteredContent, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'tr', 'td', 'th',
        'tbody', 'thead', 'tfoot', 'img', 'font', 'center', 'pre', 'code', 'hr',
        'small', 'big', 'sub', 'sup', 'br', 'address', 'cite', 'del', 'ins',
        'caption', 'colgroup', 'col', 'dd', 'dl', 'dt', 's', 'strike', 'tt',
        'var', 'article', 'section', 'header', 'footer', 'main', 'aside', 'nav',
        'figure', 'figcaption', 'mark', 'time', 'html', 'head', 'body', 'meta',
        'link', 'title', 'style'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'style', 'src', 'alt', 'width', 'height', 'face', 'size',
        'color', 'border', 'cellspacing', 'cellpadding', 'align', 'valign',
        'colspan', 'rowspan', 'bgcolor', 'id', 'name', 'class', 'dir', 'lang',
        'target', 'type', 'rel', 'media', 'charset', 'content', 'http-equiv',
        'datetime', 'cite', 'start', 'reversed', 'wrap', 'span'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option', 'svg'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'onchange'],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false
    });
    return cleanHtml;
  }

  private async replaceCidReferences(html: string): Promise<string> {
    if (!this.message?.attachments || !this.folder || !this.message.id) {
      return html;
    }

    let processedHtml = html;

    const cidMatches = new Map<string, string>();

    // Collect all CID references
    const cidRegex = /cid:([^"'\s)]+)/gi;
    let match;
    while ((match = cidRegex.exec(html)) !== null) {
      const cid = match[1];
      if (!cidMatches.has(cid)) {
        cidMatches.set(cid, '');
      }
    }

    // Load all attachments in parallel
    const loadPromises = Array.from(cidMatches.keys()).map(async (cid) => {
      const attachment = this.message!.attachments!.find(att => att.cid === cid);
      if (attachment && attachment.name) {
        try {
          const blob = await firstValueFrom(this.backendService.getAttachmentBlob(this.folder, this.message!.id, attachment.name));
          if (blob) {
            return new Promise<{ cid: string, dataUrl: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ cid, dataUrl: reader.result as string });
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.warn(`Failed to load attachment for cid:${cid}`, error);
        }
      }
      return { cid, dataUrl: '' };
    });

    const loadedAttachments = await Promise.all(loadPromises);

    // Update the CID map with the data URLs
    loadedAttachments.forEach(({ cid, dataUrl }) => {
      if (dataUrl) {
        cidMatches.set(cid, dataUrl);
      }
    });

    // Replace all CID references with data URLs
    cidMatches.forEach((dataUrl, cid) => {
      if (dataUrl) {
        const cidPattern = new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
        processedHtml = processedHtml.replace(cidPattern, dataUrl);
      }
    });

    return processedHtml;
  }

  private handleExternalResources(html: string): string {
    let processedHtml = html;

    if (!this.loadImages) {
      // Remove external images
      processedHtml = processedHtml.replace(/<img[^>]*src=["']https?:\/\/[^"']*["'][^>]*>/gi, (match) => {
        return match.replace(/src=["']https?:\/\/[^"']*["']/gi, 'src=""');
      });

      // Remove external CSS background images
      processedHtml = processedHtml.replace(/background-image:\s*url\(['"]?https?:\/\/[^'"]*['"]?\)/gi, '');

      // Remove external CSS @import
      processedHtml = processedHtml.replace(/@import\s+url\(['"]?https?:\/\/[^'"]*['"]?\);?/gi, '');

      // Remove external <link> tags (CSS, Fonts, etc.)
      processedHtml = processedHtml.replace(/<link[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi, '');

      // Remove external <style> imports
      processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?@import[^;]*;[\s\S]*?<\/style>/gi, (match) => {
        return match.replace(/@import[^;]*;/gi, '');
      });
    }

    return processedHtml;
  }

  private addSecurityToLinks(html: string): string {
    // Add target="_blank" and rel="noopener noreferrer" to all links
    return html.replace(/<a\s+([^>]*href=[^>]*)>/gi, (match, attributes) => {
      let newAttributes = attributes;

      // Ensure that target="_blank" is present
      if (!/target\s*=/i.test(newAttributes)) {
        newAttributes += ' target="_blank"';
      } else {
        newAttributes = newAttributes.replace(/target\s*=\s*["']?[^"'\s]*["']?/gi, 'target="_blank"');
      }

      // Add or extend rel="noopener noreferrer"
      if (!/rel\s*=/i.test(newAttributes)) {
        newAttributes += ' rel="noopener noreferrer"';
      } else {
        newAttributes = newAttributes.replace(/rel\s*=\s*["']?([^"']*)["']?/gi, (relMatch: string, relValue: string) => {
          const relValues = relValue.toLowerCase().split(/\s+/).filter(Boolean);
          if (!relValues.includes('noopener')) {
            relValues.push('noopener');
          }
          if (!relValues.includes('noreferrer')) {
            relValues.push('noreferrer');
          }
          return `rel="${relValues.join(' ')}"`;
        });
      }

      return `<a ${newAttributes}>`;
    });
  }

  private async updateIframeContent() {
    if (this.message?.bodyHtml) {
      let processedHtml = this.message.bodyHtml;

      // Ersetze CID-Referenzen durch Data-URLs
      processedHtml = await this.replaceCidReferences(processedHtml);

      // Behandle externe Ressourcen basierend auf loadImages Flag
      processedHtml = this.handleExternalResources(processedHtml);

      // Füge Sicherheitsattribute zu Links hinzu
      processedHtml = this.addSecurityToLinks(processedHtml);

      // Sanitize the HTML
      const sanitizedHtml = this.sanitizedContent(processedHtml);

      // Generate HTML without script
      const htmlWithScript = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:;">
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; height: 100%; overflow: auto; }
          </style>
        </head>
        <body>
          <div id="email-content">${sanitizedHtml}</div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlWithScript], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.htmlContentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  getSanitizedText(): string {
    if (!this.message?.bodyText) {
      return '';
    }

    let text = this.message.bodyText;

    // Pre-sanitize text formatting for better readability
    text = this.normalizeTextFormatting(text);

    // Use DOMPurify to sanitize the text as plain text
    // This handles any HTML-like content that might be present in plain text emails
    const sanitizedText = DOMPurify.sanitize(text, {
      // Allow absolutely no HTML tags - this is plain text only
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      // Keep the text content even when tags are removed
      KEEP_CONTENT: true,
      // Remove all data attributes
      ALLOW_DATA_ATTR: false,
      // Forbid all potentially dangerous elements
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'button', 'select', 'option', 'link', 'style'],
      // Forbid all event handlers and dangerous attributes
      FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'onchange', 'style', 'href', 'src'],
      // Return as text, not HTML
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      // Additional security measures
      SANITIZE_DOM: true,
      // Remove any URI schemes that could be dangerous
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });

    // Apply final text length limit to prevent DoS attacks
    return sanitizedText.substring(0, 50000); // Max 50KB of text
  }

  private normalizeTextFormatting(text: string): string {
    return text
      // Remove null bytes that could be used for injection
      .replace(/\0/g, '')
      // Normalize line endings to Unix format
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Reduce excessive whitespace but preserve single spaces and newlines
      .replace(/[ \t]{2,}/g, ' ')
      // Remove trailing whitespace from each line
      .replace(/[ \t]+$/gm, '')
      // Limit consecutive newlines to maximum 3 for readability
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim leading/trailing whitespace from entire text
      .trim();
  }

  ngOnDestroy() {
    if (this.htmlContentUrl) {
      URL.revokeObjectURL(this.htmlContentUrl as string);
    }
  }
}