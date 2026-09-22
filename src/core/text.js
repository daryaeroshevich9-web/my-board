/* board v3.0 stage-0 */

const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'I',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRIKE',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);

const SAFE_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'text-align',
  'font-weight',
  'font-style',
  'text-decoration',
  'width',
  'height',
  'max-width',
  'border',
  'border-collapse',
  'padding',
  'margin',
]);

export function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function cleanHref(value) {
  try {
    const url = new URL(value, window.location.href);

    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function cleanStyle(value) {
  if (!value) return null;

  const declarations = String(value)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

  const safe = [];

  for (const declaration of declarations) {
    const index = declaration.indexOf(':');
    if (index < 0) continue;

    const prop = declaration.slice(0, index).trim().toLowerCase();
    const val = declaration.slice(index + 1).trim();

    if (!SAFE_STYLE_PROPS.has(prop)) continue;
    if (/url\s*\(|javascript|expression|data:/i.test(val)) continue;

    safe.push(`${prop}: ${val}`);
  }

  return safe.length ? safe.join('; ') : null;
}

function sanitizeNode(node, doc) {
  if (node.nodeType === 3) {
    return doc.createTextNode(node.nodeValue || '');
  }

  if (node.nodeType !== 1) {
    return null;
  }

  const tag = node.tagName;

  if (!ALLOWED_TAGS.has(tag)) {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM'].includes(tag)) {
      return null;
    }

    const fragment = doc.createDocumentFragment();

    Array.from(node.childNodes).forEach((child) => {
      const cleanChild = sanitizeNode(child, doc);
      if (cleanChild) fragment.appendChild(cleanChild);
    });

    return fragment;
  }

  const cleanElement = doc.createElement(tag);

  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name === 'href' && tag === 'A') {
      const href = cleanHref(value);
      if (href) cleanElement.setAttribute('href', href);
      return;
    }

    if (name === 'style') {
      const style = cleanStyle(value);
      if (style) cleanElement.setAttribute('style', style);
      return;
    }

    if (name === 'title' && value.length <= 500) {
      cleanElement.setAttribute('title', value);
    }
  });

  if (tag === 'A') {
    cleanElement.setAttribute('target', '_blank');
    cleanElement.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(node.childNodes).forEach((child) => {
    const cleanChild = sanitizeNode(child, doc);
    if (cleanChild) cleanElement.appendChild(cleanChild);
  });

  return cleanElement;
}

export function sanitizeHtml(html = '') {
  const source = `<div>${String(html)}</div>`;
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const root = doc.body.firstChild;
  const out = document.createElement('div');

  if (!root) return '';

  Array.from(root.childNodes).forEach((child) => {
    const cleanChild = sanitizeNode(child, document);
    if (cleanChild) out.appendChild(cleanChild);
  });

  return out.innerHTML;
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function markdownToHtml(text = '') {
  const lines = String(text).split(/\r?\n/);
  let html = '';
  let listType = null;

  const closeList = () => {
    if (!listType) return;
    html += `</${listType}>`;
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);

    if (unordered) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }

      html += `<li>${inlineMarkdown(unordered[1])}</li>`;
      continue;
    }

    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }

      html += `<li>${inlineMarkdown(ordered[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }

  closeList();

  return html;
}

export function renderContent(content = '') {
  const value = String(content || '');

  if (!value) return '';

  if (/<[a-z][\s\S]*>/i.test(value)) {
    return sanitizeHtml(value);
  }

  return markdownToHtml(value);
}

export function htmlToPlain(html = '') {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(String(html), 'text/html');

  doc
    .querySelectorAll('script, style, iframe, object, embed')
    .forEach((node) => node.remove());

  const walk = (node) => {
    if (node.nodeType === 3) {
      return node.textContent || '';
    }

    if (node.nodeType !== 1) {
      return '';
    }

    const tag = node.tagName;

    if (tag === 'BR') {
      return '\n';
    }

    const childText = Array.from(node.childNodes).map(walk).join('');

    if (
      [
        'P',
        'DIV',
        'TR',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
        'UL',
        'OL',
        'TABLE',
        'PRE',
        'BLOCKQUOTE',
      ].includes(tag)
    ) {
      return `${childText}\n`;
    }

    if (tag === 'LI') {
      return `• ${childText}\n`;
    }

    return childText;
  };

  return walk(doc.body)
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
