import {
  Pipe,
  PipeTransform
} from '@angular/core';
import DOMPurify from 'dompurify';


/**
 * Renders a stored comment as safe HTML.
 *
 * Pipeline:
 *  1. Strip all HTML tags with DOMPurify (content is plain text, but defensive).
 *  2. HTML-encode the plain text so no characters can be interpreted as markup.
 *  3. Replace http/https URLs with clickable <a> links.
 *
 * The resulting string is bound via [innerHTML]; Angular's built-in sanitizer
 * runs automatically on string bindings and keeps only safe elements/attributes
 * (including <a href="http/https://...">) — no bypassSecurityTrustHtml needed.
 */
@Pipe({name: 'commentText', pure: true, standalone: true})
export class CommentTextPipe implements PipeTransform {
  
  transform(content: string): string {
    if (!content) {
      return '';
    }
    
    // 1. Strip any HTML — comments are stored as plain text, but be defensive.
    const plain = DOMPurify.sanitize(content, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
    
    // 2. HTML-encode so no character is interpreted as markup.
    const escaped = plain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // 3. Linkify http/https URLs; rel prevents reverse tabnapping.
    return escaped.replace(
      /(https?:\/\/[^\s<>"]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }
}