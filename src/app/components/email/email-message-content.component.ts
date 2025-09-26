import { Component, Input, computed, signal, Signal, ViewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
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
    <div class="email-content">
      @if (message && message.bodyHtml) {
        <iframe
          #emailFrame
          [src]="htmlContentUrl"
          frameborder="0"
          scrolling="no"
          class="email-iframe">
        </iframe>
      }
    </div>
  `,
  styles: [`
    .email-content {
      width: 100%;
    }

    .email-iframe {
      width: 100%;
      min-height: 300px;
      border: none;
      overflow: hidden;
    }
  `]
})
export class EmailMessageContentComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() message: MessageDto | null = null;
  @Input() folder: string = '';
  @Input() loadImages: boolean = false;
  @Output() loadImagesChange = new EventEmitter<boolean>();

  @ViewChild('emailFrame', { static: false }) emailFrame!: ElementRef<HTMLIFrameElement>;

  htmlContentUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer, private backendService: BackendService) {}

  ngAfterViewInit() {
    this.updateIframeContent();
  }

  ngOnChanges() {
    this.updateIframeContent();
  }

  private sanitizedContent(rawContent: string): string {
    const cleanHtml = DOMPurify.sanitize(rawContent, {
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
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option'],
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

      // Add a script for height communication
      const htmlWithScript = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="email-content">${sanitizedHtml}</div>
          <script>
            function sendHeight() {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              window.parent.postMessage({ type: 'iframe-height', height: height }, '*');
            }

            // Send height after loading
            window.addEventListener('load', sendHeight);

            // Monitor changes
            if (window.ResizeObserver) {
              const resizeObserver = new ResizeObserver(sendHeight);
              resizeObserver.observe(document.body);
            }

            // Fallback with MutationObserver
            if (window.MutationObserver) {
              const mutationObserver = new MutationObserver(sendHeight);
              mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                characterData: true,
                characterDataOldValue: true
              });
            }

            // Send height immediately
            sendHeight();
          </script>
        </body>
        </html>
      `;

      const blob = new Blob([htmlWithScript], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.htmlContentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      // Message listener for height changes
      this.setupMessageListener();
    }
  }

  private messageListener = (event: MessageEvent) => {
    if (event.data.type === 'iframe-height' && this.emailFrame?.nativeElement) {
      const iframe = this.emailFrame.nativeElement;
      iframe.style.height = event.data.height + 'px';
    }
  };

  private setupMessageListener() {
    window.removeEventListener('message', this.messageListener);
    window.addEventListener('message', this.messageListener);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageListener);
    if (this.htmlContentUrl) {
      URL.revokeObjectURL(this.htmlContentUrl as string);
    }
  }
}