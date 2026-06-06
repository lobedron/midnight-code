const el = id => document.getElementById(id);
let lastSearchTerm = "", searchMatches = [], currentMatchIdx = 0;

function escapeHtml(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function highlightSyntax(code, ext) {
    if (ext === '.html') {
        code = escapeHtml(code);
        code = code.replace(/&lt;(\/?[a-zA-Z][a-zA-Z0-9]*)(\s[^&]*?)?&gt;/g, (m, t, a) => {
            let attrs = a ? a.replace(/([a-zA-Z\-]+)=(&quot;|&apos;)(.*?)\2/g, '<span style="color: var(--syntax-attr);">$1</span>=<span style="color: var(--syntax-string);">$2$3$2</span>').replace(/(&quot;|&apos;)/g, '<span style="color: var(--syntax-string);">$1</span>') : '';
            return `<span style="color: var(--syntax-tag);">&lt;${t}${attrs}&gt;</span>`;
        });
        return code.replace(/&lt;!--(.*?)--&gt;/g, '<span style="color: var(--syntax-comment);">&lt;!--$1--&gt;</span>');
    } 
    if (ext === '.css') {
        code = escapeHtml(code);
        return code.replace(/([a-zA-Z\-]+)(?=\s*\{)/g, '<span style="color: var(--syntax-tag);">$1</span>')
                   .replace(/([a-zA-Z\-]+)(?=\s*:)/g, '<span style="color: var(--syntax-attr);">$1</span>')
                   .replace(/:\s*(.+?)(;|\})/g, ': <span style="color: var(--syntax-string);">$1</span>$2')
                   .replace(/\/\*(.*?)\*\//g, '<span style="color: var(--syntax-comment);">/*$1*/</span>');
    } 
    if (ext === '.js') {
        code = escapeHtml(code);
        ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'class', 'new', 'this', 'typeof', 'true', 'false', 'null', 'undefined', 'async', 'await', 'try', 'catch', 'import', 'export'].forEach(kw => {
            code = code.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span style="color: var(--syntax-keyword);">$1</span>`);
        });
        return code.replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: var(--syntax-string);">$1</span>')
                   .replace(/\b(\d+)\b/g, `<span style="color: var(--syntax-number);">$1</span>`)
                   .replace(/\/\/(.*?)$/gm, '<span style="color: var(--syntax-comment);">//$1</span>')
                   .replace(/\/\*(.*?)\*\//gs, '<span style="color: var(--syntax-comment);">/*$1*/</span>');
    }
    return code;
}

function applySearchHighlight(html, term) {
    if (!term) return html;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(new RegExp(`(?![^<]*>)(${safe})`, 'gi'), '<mark style="background: var(--accent); color: #000; border-radius: 2px; box-shadow: 0 0 6px var(--accent);">$1</mark>');
}

function buildSearchIndex(term) {
    const text = el('edit').value.toLowerCase(), lowerTerm = term.toLowerCase();
    searchMatches = [];
    let pos = text.indexOf(lowerTerm);
    while (pos !== -1) { searchMatches.push(pos); pos = text.indexOf(lowerTerm, pos + 1); }
}

function handleSearchKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const term = el('findInp').value.trim();
        if (!term) return;
        if (term !== lastSearchTerm) { buildSearchIndex(term); lastSearchTerm = term; currentMatchIdx = 0; } 
        else if (searchMatches.length > 0) currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
        if (searchMatches.length > 0) highlightMatch();
    }
}

function navSearch(dir) {
    if (searchMatches.length === 0) return;
    currentMatchIdx = (currentMatchIdx + dir + searchMatches.length) % searchMatches.length;
    highlightMatch();
}

function highlightMatch() {
    const pos = searchMatches[currentMatchIdx];
    const lines = el('edit').value.substring(0, pos).split('\n').length - 1;
    el('edit').scrollTop = (lines * 22) - 44;
    el('matchInfo').innerText = `${currentMatchIdx + 1}/${searchMatches.length}`;
    syncScroll();
}

function syncScroll() {
    const ta = el('edit'), sh = el('syntaxHighlight'), lb = el('lnBox');
    if (sh) { sh.scrollTop = ta.scrollTop; sh.scrollLeft = ta.scrollLeft; }
    if (lb) lb.scrollTop = ta.scrollTop;
}

function hInput() {
    const code = el('edit').value, ext = el('fExt').value, term = el('findInp').value;
    el('lnBox').innerHTML = Array.from({length: code.split('\n').length}, (_, i) => i + 1).join('<br>');
    el('syntaxHighlight').innerHTML = applySearchHighlight(highlightSyntax(code, ext), term) + '<br>';
    if (term.length > 0) {
        buildSearchIndex(term);
        el('matchInfo').innerText = searchMatches.length > 0 ? `1/${searchMatches.length}` : '0/0';
        currentMatchIdx = 0;
    } else {
        searchMatches = [];
        el('matchInfo').innerText = '0/0';
    }
    syncScroll();
    const f = el('ifr').contentWindow.document;
    f.open();
    if (ext === '.html') f.write(code);
    else f.write(ext === '.css' ? `<style>${code}</style>` : `<script>${code}<\/script>`);
    f.close();
}

function changeExt() {
    const n = el('fName').value;
    if (n.includes('.')) el('fName').value = n.split('.')[0];
    hInput();
}

function setM(m) {
    const w = el('wrap');
    w.classList.remove('v-code', 'v-view', 'v-split');
    document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('active'));
    w.classList.add(`v-${m}`);
    el(m === 'code' ? 'b1' : m === 'view' ? 'b2' : 'b3').classList.add('active');
    setTimeout(() => { hInput(); syncScroll(); }, 50);
}

function setT(bg, acc) { 
    document.documentElement.style.setProperty('--bg', bg); 
    document.documentElement.style.setProperty('--accent', acc); 
    closeThemes(); 
}

function closeThemes() { const tm = el('tm'); if(tm) tm.classList.remove('show'); }

function exp() { 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([el('edit').value]));
    a.download = (el('fName').value || 'code') + el('fExt').value;
    a.click();
}

function downloadSource() { 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([document.documentElement.outerHTML], {type: 'text/html'}));
    a.download = 'midnight_v1.6.html';
    a.click();
}

function hImport(i) { 
    if(!i.files.length) return;
    const r = new FileReader(), n = i.files[0].name;
    r.onload = e => { 
        el('edit').value = e.target.result;
        el('fExt').value = n.endsWith('.js') ? '.js' : n.endsWith('.css') ? '.css' : '.html';
        el('fName').value = n.split('.')[0];
        hInput();
    };
    r.readAsText(i.files[0]);
}

function handleKeys(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const a = e.target, s = a.selectionStart, end = a.selectionEnd;
        a.value = a.value.substring(0, s) + "    " + a.value.substring(end);
        a.selectionStart = a.selectionEnd = s + 4;
        hInput();
    }
}

window.onload = () => {
    el('fName').value = 'index';
    el('fExt').value = '.html';
    el('edit').value = '';
    setM('split');
    hInput();
};