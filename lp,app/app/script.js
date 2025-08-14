// =================================================================
// 0. FIREBASE SDK v9 IMPORT & INITIALIZATION
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJfF0jXgiaehTtOxCgWi6q1qzuNXeqHuw",
    authDomain: "my-self-analysis-note.firebaseapp.com",
    projectId: "my-self-analysis-note",
    storageBucket: "my-self-analysis-note.firebasestorage.app",
    messagingSenderId: "69394095796",
    appId: "1:69394095796:web:daf311fc3739ee5e4941e1",
    measurementId: "G-8N9WYJ5M24"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =================================================================
// 1. DOM ELEMENTS & CONSTANTS
// =================================================================
const saveStatus = document.getElementById('save-status');
const sidebar = document.getElementById('sidebar');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const floatingToolbox = document.getElementById('floating-toolbox');
const toolboxDragHandle = document.getElementById('toolbox-drag-handle');
const arrowToolBtn = document.getElementById('arrow-tool-btn');
const textLinkToolBtn = document.getElementById('text-link-tool-btn');
const multiArrowToolBtn = document.getElementById('multi-arrow-tool-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const fitToScreenBtn = document.getElementById('fit-to-screen-btn');
const inlineToolbox = document.getElementById('inline-toolbox');
const linkToolbox = document.getElementById('link-toolbox');
const lineColorBtn = document.getElementById('line-color-btn');
const lineColorPalette = document.getElementById('line-color-palette');
const addImageBtn = document.getElementById('add-image-btn');
const imageInput = document.getElementById('image-input');
const pageList = document.getElementById('page-list');
const addPageBtn = document.getElementById('add-page-btn');
const noteArea = document.getElementById('note-area');
const canvasContent = document.getElementById('canvas-content');
let drawingCanvas, connectorCanvas;
const borderToolBtn = document.getElementById('border-tool-btn');
const bgColorBtn = document.getElementById('bg-color-btn');
const eraserToolBtn = document.getElementById('eraser-tool-btn');
const modalOverlay = document.getElementById('modal-overlay');
const multiArrowTextarea = document.getElementById('multiple-arrow-textarea');
const createMultiArrowBtn = document.getElementById('create-multi-arrow-btn');
const cancelMultiArrowBtn = document.getElementById('cancel-multi-arrow-btn');
const toggleMemoBtn = document.getElementById('toggle-memo-btn');
const memoContainer = document.getElementById('memo-container');
const statsToggleBtn = document.getElementById('stats-toggle-btn');
const statsPanel = document.getElementById('stats-panel');
const totalItemsStat = document.getElementById('total-items-stat');
const todayItemsStat = document.getElementById('today-items-stat');
const totalLengthStat = document.getElementById('total-length-stat');
const lengthComparisonStat = document.getElementById('length-comparison-stat');
const focusModeBtn = document.getElementById('focus-mode-btn');
const focusOverlay = document.getElementById('focus-overlay');
const stickerToolBtn = document.getElementById('sticker-tool-btn');
const stickerToolbox = document.getElementById('sticker-toolbox');
const drawToolBtn = document.getElementById('draw-tool-btn');
const drawingToolbox = document.getElementById('drawing-toolbox');

const BASE_COLORS = ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0', '#000000', '#7F7F7F'];
const motivationalQuotes = [ '自己分析は、心の筋トレ。', '千里の道も、一歩から。', '自分を知ることは、最強の武器を手に入れること。', '今日の小さな一歩が、未来の大きな飛躍になる。', '迷ったら、書き出してみよう。答えはあなたの中にある。', '完璧なスタートなんてない。まず始めてみよう。', 'あなたの物語は、あなたにしか書けない。', '最も大きなリスクは、リスクを冒さないことだ。', '思考を整理すれば、道は自ずと開ける。' ];

// =================================================================
// 2. GLOBAL STATE
// =================================================================
let saveTimer = null;
let appData = {};
let currentMapId = null;
let currentCanvasWidth = 20000;
let currentCanvasHeight = 20000;
let currentZoom = 1.0;
let currentLineColor = '#007bff';
let clickTimer = null;
let hideToolboxTimeout;
let activeTextBox = null;
let selectedConnectorId = null;
let selectedImageId = null;
let selectedStickerId = null;
let isDragging = false;
let isDragCandidate = false;
let draggedBox = null;
let dragStartPos = { x: 0, y: 0 };
let isPanning = false;
let isClickCandidate = false;
let panStartScroll = { left: 0, top: 0 };
let isToolboxDragging = false;
let toolboxOffsetX, toolboxOffsetY;
let isSwitchingFocusProgrammatically = false;
let isArrowMode = false;
let arrowStartPoint = null;
let isTextLinkMode = false;
let textLinkStartInfo = null;
let isMultiArrowMode = false;
let multiArrowStartBoxId = null;
let isBorderMode = false;
let isBgColorMode = false;
let isEraserMode = false;
let isImageDragging = false;
let isResizing = false;
let resizeHandleType = '';
let draggedImageWrapper = null;
let imageDragOffset = { x: 0, y: 0 };
let isImageJustDragged = false;
let isStickerMode = false;
let selectedStickerType = null;
let isStickerDragging = false;
let isStickerResizing = false;
let draggedStickerWrapper = null;
let stickerDragOffset = { x: 0, y: 0 };
let isDrawingMode = false;
let currentDrawingTool = 'freehand';
let currentDrawingStyle = { stroke: '#000000', strokeWidth: 3, opacity: 1.0, fillType: 'solid' };
let isDrawing = false;
let isErasing = false;
let currentShapeData = null;
let isFocusModeActive = false;
let isFocusApplied = false;
let focusedElements = new Set();
let isMemoDragging = false;
let draggedMemo = null;
let memoDragOffset = { x: 0, y: 0 };

// =================================================================
// 3. CORE: DATA & STORAGE (Firebase v9 ver.)
// =================================================================
function debouncedSaveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        // ★★★★★★★★★★★★
        // ★ 修正点：正しくsaveStateを呼び出す
        saveState();
        // ★★★★★★★★★★★★
    }, 2000);
}

async function saveState() {
    if (auth.currentUser && currentMapId) {
        updateSaveStatus('saving');
        const mapDocRef = doc(db, 'mindmaps', currentMapId);
        try {
            await updateDoc(mapDocRef, { content: appData });
            console.log("データがFirestoreに保存されました。");
            updateSaveStatus('saved');
        } catch (error) {
            console.error("データの保存に失敗しました:", error);
            updateSaveStatus('error');
        }
    }
    updateStatsPanel();
}
function undo() { /* Undo/Redoは一旦無効化 */ }
function redo() { /* Undo/Redoは一旦無効化 */ }

// =================================================================
// 4. CORE: COORDINATES & CANVAS HELPERS
// =================================================================
function getCanvasCoordinates(e) { return { x: (e.clientX - canvasContent.getBoundingClientRect().left) / currentZoom, y: (e.clientY - canvasContent.getBoundingClientRect().top) / currentZoom }; }
function getIntersectionPoint(sourceRect, targetCenter) { const sourceCenter = { x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + sourceRect.height / 2 }; const w = sourceRect.width / 2; const h = sourceRect.height / 2; const dx = targetCenter.x - sourceCenter.x; const dy = targetCenter.y - sourceCenter.y; if (dx === 0 && dy === 0) return sourceCenter; let x_ratio = w > 0 ? Math.abs(dx / w) : Infinity; let y_ratio = h > 0 ? Math.abs(dy / h) : Infinity; if (x_ratio > y_ratio) { const sign = Math.sign(dx); return { x: sourceCenter.x + sign * w, y: sourceCenter.y + dy * (w / Math.abs(dx)) }; } else { const sign = Math.sign(dy); return { x: sourceCenter.x + dx * (h / Math.abs(dy)), y: sourceCenter.y + sign * h }; } }
function hexToRgba(hex, alpha) { if (!hex) hex = '#007bff'; const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
function checkAndExpandCanvas(x, y) {
    const threshold = 2000;
    const expandAmount = 5000;
    let needsUpdate = false;
    if (x > currentCanvasWidth - threshold) {
        currentCanvasWidth += expandAmount;
        needsUpdate = true;
    }
    if (y > currentCanvasHeight - threshold) {
        currentCanvasHeight += expandAmount;
        needsUpdate = true;
    }
    if (needsUpdate) {
        canvasContent.style.width = currentCanvasWidth + 'px';
        canvasContent.style.height = currentCanvasHeight + 'px';
    }
}

// =================================================================
// 5. RENDERING & UI UPDATES
// =================================================================
function render() {
    if (!appData.pages) {
        return;
    }
    renderPageList();
    renderCurrentPage();
}
function renderCurrentPage() {
    canvasContent.innerHTML = '<svg id="drawing-canvas"></svg><svg id="connector-canvas"></svg>';
    canvasContent.style.width = currentCanvasWidth + 'px';
    canvasContent.style.height = currentCanvasHeight + 'px';
    drawingCanvas = document.getElementById('drawing-canvas');
    connectorCanvas = document.getElementById('connector-canvas');
    activeTextBox = null; 
    hideInlineToolbox(); 
    hideLinkToolbox();
    const page = appData.pages?.[appData.currentPageId];
    if (page) {
        renderImages();
        renderStickers();
        (page.content || []).forEach(boxData => createTextBox(boxData, false));
        renderConnectorsAndLabels();
        renderShapes();
        renderMemo();
    }
    updateToolbarState();
    updateStatsPanel();
}
function updateSaveStatus(status) {
    if (!saveStatus) return;
    switch (status) {
        case 'saving':
            saveStatus.textContent = '保存中...';
            saveStatus.className = 'saving visible';
            break;
        case 'saved':
            saveStatus.textContent = '✔ 保存済み';
            saveStatus.className = 'saved visible';
            setTimeout(() => {
                saveStatus.classList.remove('visible');
            }, 2000);
            break;
        case 'error':
            saveStatus.textContent = '❌ 保存失敗';
            saveStatus.className = 'error visible';
            break;
        default:
            saveStatus.classList.remove('visible');
    }
}
function renderPageList() {
    pageList.innerHTML = '';
    if (!appData.pages) return;
    Object.keys(appData.pages).forEach(pageId => {
        const page = appData.pages[pageId];
        const li = document.createElement('li');
        li.dataset.pageId = pageId;
        const span = document.createElement('span');
        span.textContent = page.title;
        li.appendChild(span);
        if (pageId === appData.currentPageId) li.classList.add('selected');
        li.addEventListener('click', () => switchPage(pageId));
        span.addEventListener('dblclick', (e) => { e.stopPropagation(); span.contentEditable = true; span.focus(); document.execCommand('selectAll', false, null); });
        span.addEventListener('blur', () => { span.contentEditable = false; const newTitle = span.textContent.trim(); if (newTitle) page.title = newTitle; else span.textContent = page.title; debouncedSaveState(); });
        span.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); span.blur(); } });
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-page-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'ページを削除';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deletePage(pageId); });
        li.appendChild(deleteBtn);
        pageList.appendChild(li);
    });
}
function updateToolbarState() { 
    arrowToolBtn.classList.toggle('active', isArrowMode); 
    textLinkToolBtn.classList.toggle('active', isTextLinkMode); 
    drawToolBtn.classList.toggle('active', isDrawingMode); 
    multiArrowToolBtn.classList.toggle('active', isMultiArrowMode);
    borderToolBtn.classList.toggle('active', isBorderMode);
    bgColorBtn.classList.toggle('active', isBgColorMode);
    eraserToolBtn.classList.toggle('active', isEraserMode);
    focusModeBtn.classList.toggle('active', isFocusModeActive || isFocusApplied);
    stickerToolBtn.classList.toggle('active', isStickerMode);
}

// =================================================================
// 6. FEATURE: PAGES
// =================================================================
function switchPage(pageId) { if (appData.currentPageId === pageId) return; appData.currentPageId = pageId; selectedConnectorId = null; selectedImageId = null; render(); debouncedSaveState(); }
function addNewPage() {
    const pageId = `page-${Date.now()}`;
    const timestamp = Date.now();
    const centerX = currentCanvasWidth / 2;
    const centerY = currentCanvasHeight / 2;
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const newPage = { title: '（無題のページ）', content: [ { id: `box-quote-${timestamp}`, x: centerX, y: centerY, html: `<i>${randomQuote}</i>`, isBordered: false, borderColor: '#333333', backgroundColor: '', createdAt: Date.now() } ], connectors: [], shapes: [], images: [], stickers: [], memo: null };
    if (!appData.pages) appData.pages = {};
    appData.pages[pageId] = newPage;
    switchPage(pageId);
    setTimeout(() => scrollToCenter(centerX, centerY), 50);
}
function deletePage(pageIdToDelete) {
    if (Object.keys(appData.pages).length <= 1) {
        alert('最後のページは削除できません。');
        return;
    }
    if (confirm(`ページ「${appData.pages[pageIdToDelete].title}」を削除しますか？\nこの操作は元に戻せません。`)) {
        const isDeletingCurrentPage = appData.currentPageId === pageIdToDelete;
        delete appData.pages[pageIdToDelete];
        if (isDeletingCurrentPage) appData.currentPageId = Object.keys(appData.pages)[0];
        debouncedSaveState();
        render();
    }
}

// =================================================================
// 7. FEATURE: TEXTBOX
// =================================================================
function createTextBox(boxData, shouldFocus) { 
    const textBox = document.createElement('div'); 
    textBox.className = 'textbox'; 
    textBox.id = boxData.id; 
    textBox.style.left = `${boxData.x}px`; 
    textBox.style.top = `${boxData.y}px`; 
    textBox.innerHTML = boxData.html || ''; 
    if (boxData.isBordered) { 
        textBox.classList.add('bordered'); 
        textBox.style.borderColor = boxData.borderColor || '#333333'; 
    }
    if (boxData.backgroundColor) {
        textBox.style.backgroundColor = boxData.backgroundColor;
    }
    textBox.addEventListener('mousedown', (e) => {
        if (isFocusApplied) {
            if (!focusedElements.has(textBox.id)) return;
        } else if (isArrowMode || isTextLinkMode || isDrawingMode || isMultiArrowMode || isBorderMode || isBgColorMode || isEraserMode || isFocusModeActive || isStickerMode) {
            return;
        }
        if (selectedConnectorId) { selectConnector(selectedConnectorId); } 
        if (textBox.classList.contains('editing') && e.target.closest('.textbox')) return; 
        isDragCandidate = true; 
        draggedBox = textBox; 
        dragStartPos = { x: e.clientX, y: e.clientY }; 
    }); 
    textBox.addEventListener('click', (e) => { 
        if (isDragging) return;
        e.stopPropagation(); 
        if(isEraserMode) {
            deleteTextBoxById(textBox.id);
            return;
        }
        if (isFocusModeActive) {
            applyFocus(textBox.id);
            return;
        }
        if (isArrowMode) { handleArrowModeClick(textBox); return; }
        if (isTextLinkMode && textLinkStartInfo) { handleConnectionEnd(textBox); return; }
        if (isMultiArrowMode) { handleMultiArrowStart(textBox); return; }
        if (isBorderMode) {
            textBox.classList.toggle('bordered');
            if (textBox.classList.contains('bordered')) textBox.style.borderColor = currentLineColor;
            textBox.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        if (isBgColorMode) {
            const semiTransparentColor = hexToRgba(currentLineColor, 0.5);
            if (textBox.style.backgroundColor === semiTransparentColor) textBox.style.backgroundColor = '';
            else textBox.style.backgroundColor = semiTransparentColor;
            textBox.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        if (!textBox.classList.contains('editing')) { 
            textBox.contentEditable = true; 
            textBox.focus(); 
        } 
    }); 
    textBox.addEventListener('mouseup', (e) => { if (isTextLinkMode && !textLinkStartInfo) handleTextSelection(e, textBox); });
    textBox.addEventListener('focus', () => {
        const currentlyEditing = document.querySelector('.textbox.editing');
        if (currentlyEditing && currentlyEditing !== textBox) currentlyEditing.classList.remove('editing');
        activeTextBox = textBox;
        textBox.classList.add('editing');
        showInlineToolbox(textBox);
    });
    textBox.addEventListener('blur', () => { 
        if (isSwitchingFocusProgrammatically) return;
        setTimeout(() => { 
            if (document.activeElement.id !== 'font-size-selector') { 
                textBox.classList.remove('editing'); 
                textBox.contentEditable = false; 
                if (activeTextBox === textBox) activeTextBox = null; 
                hideInlineToolbox(); 
                const page = appData.pages[appData.currentPageId]; 
                const box = page?.content?.find(b => b.id === textBox.id); 
                if (box) { 
                    const linksFromThisBox = (page.connectors || []).filter(c => c.type === 'text' && c.startBoxId === textBox.id); 
                    const removedLinkIds = linksFromThisBox.filter(c => !textBox.querySelector(`#${c.startElementId}`)).map(c => c.id); 
                    if (removedLinkIds.length > 0) page.connectors = page.connectors.filter(c => !removedLinkIds.includes(c.id)); 
                    box.html = textBox.innerHTML; 
                    box.isBordered = textBox.classList.contains('bordered'); 
                    box.borderColor = textBox.style.borderColor;
                    box.backgroundColor = textBox.style.backgroundColor;
                    if (textBox.textContent.trim() === '') { 
                        const boxIdToRemove = textBox.id; 
                        const incomingTextLinks = (page.connectors || []).filter(conn => conn.endBoxId === boxIdToRemove && conn.type === 'text'); 
                        incomingTextLinks.forEach(conn => { 
                            const sourceBox = document.getElementById(conn.startBoxId); 
                            if (sourceBox) { 
                                const linkSourceElement = sourceBox.querySelector(`#${conn.startElementId}`); 
                                if (linkSourceElement) { 
                                    const parent = linkSourceElement.parentNode; 
                                    while (linkSourceElement.firstChild) { parent.insertBefore(linkSourceElement.firstChild, linkSourceElement); } 
                                    parent.removeChild(linkSourceElement); 
                                    parent.normalize(); 
                                    const sourceBoxData = page.content.find(b => b.id === conn.startBoxId); 
                                    if (sourceBoxData) { sourceBoxData.html = sourceBox.innerHTML; } 
                                } 
                            } 
                        }); 
                        page.content = page.content.filter(b => b.id !== boxIdToRemove); 
                        page.connectors = (page.connectors || []).filter(conn => conn.startBoxId !== boxIdToRemove && conn.endBoxId !== boxIdToRemove); 
                        textBox.remove(); 
                    } 
                    debouncedSaveState(); 
                    renderConnectorsAndLabels(); 
                } 
            } 
        }, 0); 
    }); 
 textBox.addEventListener('input', () => { 
    const page = appData.pages[appData.currentPageId]; 
    const box = page?.content?.find(b => b.id === textBox.id); 
    if (box) box.html = textBox.innerHTML; 
    if(activeTextBox === textBox) showInlineToolbox(textBox); 
    renderConnectorsAndLabels();
    
    // ★テキスト編集中も、入力が止まったら自動保存するようにする
    debouncedSaveState(); 
});
    canvasContent.appendChild(textBox); 
    if (shouldFocus) { 
        textBox.contentEditable = true; 
        textBox.focus(); 
    } 
}
function deleteActiveTextBox() { 
    if (!activeTextBox) return; 
    const boxId = activeTextBox.id; 
    deleteTextBoxById(boxId);
}
function deleteTextBoxById(boxId) {
    const page = appData.pages[appData.currentPageId];
    if (!page) return;
    const connectorsToDelete = (page.connectors || []).filter(conn => conn.startBoxId === boxId || conn.endBoxId === boxId).map(c => c.id);
    connectorsToDelete.forEach(id => deleteConnector(id));
    page.content = page.content.filter(b => b.id !== boxId);
    if (activeTextBox && activeTextBox.id === boxId) activeTextBox = null;
    document.getElementById(boxId)?.remove();
    debouncedSaveState();
    renderConnectorsAndLabels();
}


    // =================================================================
    // 8. FEATURE: CONNECTORS & ARROWS
    // =================================================================
// --- 変更後: renderConnectorsAndLabels 開始 ---
    function renderConnectorsAndLabels() {
        const svg = connectorCanvas; if (!svg) return;
        svg.querySelectorAll('.connector-group').forEach(g => g.remove());
        
        canvasContent.querySelectorAll('.connector-label, .delete-arrow-btn').forEach(el => {
            if (el.parentNode) {
                el.remove();
            }
        });
        
        let defs = svg.querySelector('defs');
        if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.appendChild(defs); }

        const page = appData.pages?.[appData.currentPageId];
        if (!page || !page.connectors) return;
        const requiredColors = [...new Set(page.connectors.map(c => c.color || '#007bff'))];
        defs.innerHTML = ''; 
        requiredColors.forEach(color => { 
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker'); 
            const markerId = `arrowhead-${color.replace(/#/g, '')}`; 
            marker.setAttribute('id', markerId); marker.setAttribute('viewBox', '0 0 10 10'); marker.setAttribute('refX', '8'); marker.setAttribute('refY', '5'); marker.setAttribute('markerWidth', '6'); marker.setAttribute('markerHeight', '6'); marker.setAttribute('orient', 'auto-start-reverse'); 
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
            path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z'); path.setAttribute('fill', color); 
            marker.appendChild(path); defs.appendChild(marker);
            const markerThickId = `arrowhead-thick-${color.replace(/#/g, '')}`;
            const markerThick = marker.cloneNode(true);
            markerThick.setAttribute('id', markerThickId); markerThick.setAttribute('markerWidth', '4'); markerThick.setAttribute('markerHeight', '4');
            defs.appendChild(markerThick);
        }); 
        const connectorsToDraw = [...page.connectors];
        connectorsToDraw.sort((a, b) => (a.branchPoint ? 1 : -1) - (b.branchPoint ? 1 : -1));
        const branchPointsCoords = {};
        connectorsToDraw.forEach(conn => { 
            const endEl = document.getElementById(conn.endBoxId);
            if (!endEl) return;
            const endRect = { x: endEl.offsetLeft, y: endEl.offsetTop, width: endEl.offsetWidth, height: endEl.offsetHeight };
            const endCenter = { x: endRect.x + endRect.width / 2, y: endRect.y + endRect.height / 2 };
            let startPoint, startCenter;
            if (conn.branchPoint) {
                const parentConn = connectorsToDraw.find(c => c.id === conn.branchPoint.parentId); if (!parentConn) return;
                const parentStartBox = document.getElementById(parentConn.startBoxId); const parentEndBox = document.getElementById(parentConn.endBoxId); if (!parentStartBox || !parentEndBox) return;
                const parentStartRect = { x: parentStartBox.offsetLeft, y: parentStartBox.offsetTop, width: parentStartBox.offsetWidth, height: parentStartBox.offsetHeight };
                const parentEndRect = { x: parentEndBox.offsetLeft, y: parentEndBox.offsetTop, width: parentEndBox.offsetWidth, height: parentEndBox.offsetHeight };
                const parentStartPoint = getIntersectionPoint(parentStartRect, {x: parentEndRect.x + parentEndRect.width/2, y: parentEndRect.y + parentEndRect.height/2});
                const parentEndPoint = getIntersectionPoint(parentEndRect, {x: parentStartRect.x + parentStartRect.width/2, y: parentStartRect.y + parentStartRect.height/2});
                startPoint = { x: parentStartPoint.x + (parentEndPoint.x - parentStartPoint.x) * conn.branchPoint.position, y: parentStartPoint.y + (parentEndPoint.y - parentStartPoint.y) * conn.branchPoint.position, };
                branchPointsCoords[conn.branchPoint.parentId] = branchPointsCoords[conn.branchPoint.parentId] || [];
                branchPointsCoords[conn.branchPoint.parentId].push(startPoint);
                startCenter = startPoint;
            } else {
                const startEl = document.getElementById(conn.startBoxId);
                if (!startEl) return;
                if (conn.type === 'text') {
                    const startElement = document.getElementById(conn.startElementId); if (!startElement) return; 
                    const color = conn.color || '#007bff'; startElement.style.setProperty('--link-bg-color', hexToRgba(color, 0.3)); startElement.style.setProperty('--link-hover-bg-color', hexToRgba(color, 0.5)); 
                    const startElemDOMRect = startElement.getBoundingClientRect(); const canvasDOMRect = canvasContent.getBoundingClientRect(); 
                    const startRect = { x: (startElemDOMRect.left - canvasDOMRect.left) / currentZoom, y: (startElemDOMRect.top - canvasDOMRect.top) / currentZoom, width: startElemDOMRect.width / currentZoom, height: startElemDOMRect.height / currentZoom }; 
                    startPoint = getIntersectionPoint(startRect, endCenter);
                    startCenter = { x: startRect.x + startRect.width / 2, y: startRect.y + startRect.height / 2 };
                } else {
                    const startRect = { x: startEl.offsetLeft, y: startEl.offsetTop, width: startEl.offsetWidth, height: startEl.offsetHeight };
                    startPoint = getIntersectionPoint(startRect, endCenter);
                    startCenter = { x: startRect.x + startRect.width / 2, y: startRect.y + startRect.height / 2 };
                }
            }
            const endPoint = getIntersectionPoint(endRect, startCenter); 
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.classList.add('connector-group'); g.dataset.connId = conn.id;
            if (isFocusApplied && focusedElements.has(conn.id)) g.classList.add('focused');
            let d_str = `M ${startPoint.x} ${startPoint.y}`;
            if (branchPointsCoords[conn.id]) {
                const midPoint = { x: startPoint.x + (endPoint.x - startPoint.x) * 0.5, y: startPoint.y + (endPoint.y - startPoint.y) * 0.5 };
                d_str += ` L ${midPoint.x} ${midPoint.y}`;
                branchPointsCoords[conn.id].forEach(bp => { d_str += ` M ${midPoint.x} ${midPoint.y} L ${bp.x} ${bp.y}`; });
                d_str += ` M ${midPoint.x} ${midPoint.y} L ${endPoint.x} ${endPoint.y}`;
            } else { d_str += ` L ${endPoint.x} ${endPoint.y}`; }
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); hitPath.setAttribute('d', d_str); hitPath.style.stroke = 'transparent'; hitPath.style.strokeWidth = '20px'; hitPath.style.fill = 'none'; hitPath.style.pointerEvents = 'stroke';
            g.appendChild(hitPath);
            const style = conn.linkStyle || 'solid';
            const color = conn.color || '#007bff';
            const markerId = `arrowhead-${color.replace(/#/g, '')}`;
            const markerThickId = `arrowhead-thick-${color.replace(/#/g, '')}`;
            const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            visiblePath.setAttribute('d', d_str); visiblePath.classList.add('connector-visible-line'); visiblePath.style.stroke = color;
            switch(style) {
                case 'dashed': visiblePath.style.strokeDasharray = '8, 8'; visiblePath.style.strokeWidth = '2px'; if (conn.type !== 'text') visiblePath.setAttribute('marker-end', `url(#${markerId})`); break;
                case 'thick': visiblePath.style.strokeWidth = '6px'; if (conn.type !== 'text') visiblePath.setAttribute('marker-end', `url(#${markerThickId})`); break;
                case 'thin': visiblePath.style.strokeWidth = '2px'; visiblePath.style.opacity = '0.4'; if (conn.type !== 'text') visiblePath.setAttribute('marker-end', `url(#${markerId})`); break;
                default: visiblePath.style.strokeWidth = '2px'; if (conn.type !== 'text') visiblePath.setAttribute('marker-end', `url(#${markerId})`);
            }
            g.appendChild(visiblePath);
            g.addEventListener('mousedown', (e) => { e.stopPropagation(); clearTimeout(clickTimer); clickTimer = setTimeout(() => { if (isEraserMode) deleteConnector(conn.id); else selectConnector(conn.id, g); }, 150); });
            g.addEventListener('dblclick', (e) => { e.stopPropagation(); clearTimeout(clickTimer); let label = document.getElementById(`label-${conn.id}`); if (!label) { const clickCoords = getCanvasCoordinates(e); label = document.createElement('div'); label.className = 'connector-label'; label.id = `label-${conn.id}`; label.style.left = `${clickCoords.x}px`; label.style.top = `${clickCoords.y}px`; canvasContent.appendChild(label); } makeLabelEditable(label); }); 
            svg.appendChild(g); 
            if (conn.label && conn.label.trim()) { 
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                const label = document.createElement('div');
                label.className = 'connector-label'; label.id = `label-${conn.id}`; label.textContent = conn.label; label.style.left = `${midX}px`; label.style.top = `${midY}px`;
                if (isFocusApplied && focusedElements.has(conn.id)) label.classList.add('focused');
                label.addEventListener('dblclick', (e) => { e.stopPropagation(); makeLabelEditable(label); });
                canvasContent.appendChild(label);
            } 
            if (conn.id === selectedConnectorId) { g.classList.add('selected'); const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-arrow-btn'; deleteBtn.innerHTML = '×'; deleteBtn.dataset.connId = conn.id; deleteBtn.style.left = `${endPoint.x}px`; deleteBtn.style.top = `${endPoint.y}px`; deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteConnector(conn.id); }); canvasContent.appendChild(deleteBtn); }
        }); 
    }
// --- 変更後: renderConnectorsAndLabels 終了 ---
    
    function createNewConnector(startInfo, endBoxId) {
        const page = appData.pages[appData.currentPageId];
        const newConnector = { id: `conn-${Date.now()}`, endBoxId: endBoxId, label: '', color: currentLineColor, linkStyle: 'solid' };
        if (startInfo.type === 'text') Object.assign(newConnector, { type: 'text', startBoxId: startInfo.boxId, startElementId: startInfo.elementId }); 
        else Object.assign(newConnector, { type: 'box', startBoxId: startInfo.startBoxId }); 
        if (!page.connectors) page.connectors = []; 
        page.connectors.push(newConnector); 
        debouncedSaveState(); 
        selectedConnectorId = newConnector.id; 
        renderConnectorsAndLabels();
    }

    function createConnectedBoxWithLabelPrompt(startInfo, newBoxCoords) {
        isSwitchingFocusProgrammatically = true; 
        const page = appData.pages[appData.currentPageId];
        if (!page) { isSwitchingFocusProgrammatically = false; return; }
        const newBoxData = { id: `box-${Date.now()}`, x: newBoxCoords.x, y: newBoxCoords.y, html: '', isBordered: false, borderColor: '#333333', createdAt: Date.now() };
        if (!page.content) page.content = [];
        page.content.push(newBoxData);
        checkAndExpandCanvas(newBoxData.x, newBoxData.y);
        const newConnectorData = { id: `conn-${Date.now()}`, endBoxId: newBoxData.id, label: '', color: currentLineColor, linkStyle: 'solid' };
        if (startInfo.type === 'text') Object.assign(newConnectorData, { type: 'text', startBoxId: startInfo.boxId, startElementId: startInfo.elementId });
        else Object.assign(newConnectorData, { type: 'box', startBoxId: startInfo.startBoxId });
        if (!page.connectors) page.connectors = [];
        page.connectors.push(newConnectorData);
        createTextBox(newBoxData, false);
        renderConnectorsAndLabels();
        const startBox = document.getElementById(newConnectorData.startBoxId);
        const endBox = document.getElementById(newConnectorData.endBoxId);
        if (!startBox || !endBox) { debouncedSaveState(); isSwitchingFocusProgrammatically = false; return; }
        let startPoint;
        const endRect = { x: endBox.offsetLeft, y: endBox.offsetTop, width: endBox.offsetWidth, height: endBox.offsetHeight };
        const endCenter = { x: endRect.x + endRect.width / 2, y: endRect.y + endRect.height / 2 };
        if (newConnectorData.type === 'text') {
            const startElement = document.getElementById(newConnectorData.startElementId);
            if (!startElement) { debouncedSaveState(); isSwitchingFocusProgrammatically = false; return; }
            const startElemDOMRect = startElement.getBoundingClientRect(); const canvasDOMRect = canvasContent.getBoundingClientRect();
            const startRect = { x: (startElemDOMRect.left - canvasDOMRect.left) / currentZoom, y: (startElemDOMRect.top - canvasDOMRect.top) / currentZoom, width: startElemDOMRect.width / currentZoom, height: startElemDOMRect.height / currentZoom };
            startPoint = getIntersectionPoint(startRect, endCenter);
        } else {
            const startRect = { x: startBox.offsetLeft, y: startBox.offsetTop, width: startBox.offsetWidth, height: startBox.offsetHeight };
            startPoint = getIntersectionPoint(startRect, endCenter);
        }
        const endPoint = getIntersectionPoint(endRect, { x: startPoint.x, y: startPoint.y });
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        const tempLabel = document.createElement('div');
        tempLabel.className = 'connector-label';
        tempLabel.style.left = `${midX}px`; tempLabel.style.top = `${midY}px`;
        canvasContent.appendChild(tempLabel);
        makeLabelEditable(tempLabel, (labelText) => {
            newConnectorData.label = labelText;
            renderConnectorsAndLabels();
            if (isFocusApplied) {
                focusedElements.add(newBoxData.id);
                focusedElements.add(newConnectorData.id);
                document.getElementById(newBoxData.id)?.classList.add('focused');
                const connGroup = connectorCanvas.querySelector(`[data-conn-id="${newConnectorData.id}"]`);
                if (connGroup) { connGroup.classList.add('focused'); const connLabel = canvasContent.querySelector(`#label-${newConnectorData.id}`); if (connLabel) connLabel.classList.add('focused'); }
            }
            const newBoxElement = document.getElementById(newBoxData.id);
            if (newBoxElement) {
                newBoxElement.contentEditable = true;
                setTimeout(() => { newBoxElement.focus(); isSwitchingFocusProgrammatically = false; }, 0);
            } else { isSwitchingFocusProgrammatically = false; }
            debouncedSaveState();
        });
    }

    function selectConnector(connectorId, groupElement) {
        const svg = connectorCanvas; if (!svg) return;
        const previouslySelectedId = selectedConnectorId;
        if (previouslySelectedId) {
            const prevGroup = svg.querySelector(`.connector-group[data-conn-id="${previouslySelectedId}"]`);
            if (prevGroup) prevGroup.classList.remove('selected');
            canvasContent.querySelector(`.delete-arrow-btn[data-conn-id="${previouslySelectedId}"]`)?.remove();
        }
        if (previouslySelectedId === connectorId) { selectedConnectorId = null; hideLinkToolbox(); return; }
        selectedConnectorId = connectorId;
        const newGroup = groupElement || svg.querySelector(`.connector-group[data-conn-id="${connectorId}"]`);
        if (newGroup) {
            newGroup.classList.add('selected');
            showLinkToolbox(connectorId, newGroup);
            const path = newGroup.querySelector('.connector-visible-line');
            if (path) {
                const d = path.getAttribute('d');
                const points = d.split(' ').filter(p => p !== 'M' && p !== 'L');
                const endPoint = { x: points[points.length - 2], y: points[points.length - 1] };
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-arrow-btn'; deleteBtn.innerHTML = '×'; deleteBtn.dataset.connId = connectorId;
                deleteBtn.style.left = `${endPoint.x}px`; deleteBtn.style.top = `${endPoint.y}px`;
                deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteConnector(connectorId); });
                canvasContent.appendChild(deleteBtn);
            }
        }
    }

    function deleteConnector(connectorId) { 
        const page = appData.pages[appData.currentPageId]; if (!page || !page.connectors) return;
        page.connectors = page.connectors.filter(c => c.branchPoint?.parentId !== connectorId);
        const connIndex = page.connectors.findIndex(c => c.id === connectorId); if (connIndex === -1) return;
        const conn = page.connectors[connIndex]; 
        if (conn.type === 'text') { 
            const startBox = document.getElementById(conn.startBoxId); 
            if (startBox) { 
                const boxData = page.content.find(b => b.id === conn.startBoxId); 
                if(boxData){ 
                    const startElement = startBox.querySelector(`#${conn.startElementId}`); 
                    if (startElement) { 
                        const parent = startElement.parentNode; 
                        while (startElement.firstChild) { parent.insertBefore(startElement.firstChild, startElement); } 
                        parent.removeChild(startElement); parent.normalize(); 
                        boxData.html = startBox.innerHTML; 
                    } 
                } 
            } 
        } 
        page.connectors.splice(connIndex, 1); 
        selectedConnectorId = null; 
        hideLinkToolbox();
        debouncedSaveState(); 
        renderConnectorsAndLabels();
    }
    
    function makeLabelEditable(labelElement, onFinishCallback) {
        labelElement.classList.add('editing');
        labelElement.contentEditable = true;
        labelElement.focus();
        document.execCommand('selectAll', false, null);
        const finishEditing = () => {
            labelElement.classList.remove('editing');
            labelElement.removeEventListener('blur', onBlur);
            labelElement.removeEventListener('keydown', onKeydown);
            labelElement.contentEditable = false;
            const newLabelText = labelElement.textContent.trim();
            if (onFinishCallback) {
                labelElement.remove();
                onFinishCallback(newLabelText);
            } else {
                const connId = labelElement.id.replace('label-', '');
                const page = appData.pages[appData.currentPageId];
                const connector = page.connectors.find(c => c.id === connId);
                if (connector) {
                    if (connector.label !== newLabelText) { connector.label = newLabelText; debouncedSaveState(); }
                    if (!newLabelText) labelElement.remove();
                }
            }
        };
        const onBlur = () => finishEditing();
        const onKeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); labelElement.blur(); } };
        labelElement.addEventListener('blur', onBlur);
        labelElement.addEventListener('keydown', onKeydown);
    }
    
    function splitSelectedArrow() {
        if (!selectedConnectorId) return;
        const page = appData.pages[appData.currentPageId]; if (!page || !page.connectors) return;
        const selectedConnector = page.connectors.find(c => c.id === selectedConnectorId); if (!selectedConnector) return;
        let originalConnector = selectedConnector;
        if (selectedConnector.branchPoint) originalConnector = page.connectors.find(c => c.id === selectedConnector.branchPoint.parentId);
        if (!originalConnector || originalConnector.type !== 'box') return;
        const endBox = document.getElementById(originalConnector.endBoxId); if (!endBox) return;
        const newBoxCoords = { x: endBox.offsetLeft + 100, y: endBox.offsetTop + 100 };
        const newBoxData = { id: `box-${Date.now()}`, x: newBoxCoords.x, y: newBoxCoords.y, html: '新しい分岐', isBordered: false, borderColor: '#333333', createdAt: Date.now() };
        page.content.push(newBoxData);
        checkAndExpandCanvas(newBoxData.x, newBoxData.y);
        const newConnector = { id: `conn-${Date.now()}`, type: 'box', endBoxId: newBoxData.id, label: '', color: originalConnector.color, branchPoint: { parentId: originalConnector.id, position: 0.5 } };
        page.connectors.push(newConnector);
        createTextBox(newBoxData, true);
        selectedConnectorId = newConnector.id;
        renderConnectorsAndLabels();
        debouncedSaveState();
    }

    // Handlers for arrow/link modes
    function handleArrowModeClick(element) { 
        if (!arrowStartPoint) arrowStartPoint = { type: 'box', startBoxId: element.id }; 
        else { 
            if (element.id !== arrowStartPoint.startBoxId) createNewConnector(arrowStartPoint, element.id); 
            arrowStartPoint = null;
        } 
    }
    
    function handleTextSelection(event, textBox) { 
        const selection = window.getSelection(); 
        if (selection.isCollapsed || !textBox.contains(selection.anchorNode)) return; 
        const range = selection.getRangeAt(0); 
        const span = document.createElement('span'); 
        span.id = `link-source-${Date.now()}`; 
        span.className = 'text-link-source'; 
        try { 
            range.surroundContents(span); 
            selection.removeAllRanges(); 
            textLinkStartInfo = { type: 'text', boxId: textBox.id, elementId: span.id }; 
            noteArea.classList.add('text-link-mode-linking'); 
            noteArea.classList.remove('text-link-mode'); 
            const page = appData.pages[appData.currentPageId]; 
            const box = page.content.find(b => b.id === textBox.id); 
            if (box) box.html = textBox.innerHTML; 
            debouncedSaveState(); 
        } catch (e) { 
            console.error("範囲のラップに失敗しました: ", e); 
            span.remove(); 
        } 
    }
    
    function handleConnectionEnd(endElement) { 
        if (textLinkStartInfo.boxId === endElement.id) return;
        createNewConnector(textLinkStartInfo, endElement.id); 
        isTextLinkMode = false; 
        textLinkStartInfo = null; 
        updateToolbarState(); 
        noteArea.classList.remove('text-link-mode-linking'); 
    }
    
    function handleMultiArrowStart(startElement) {
        multiArrowStartBoxId = startElement.id;
        modalOverlay.classList.remove('hidden');
        multiArrowTextarea.focus();
        isMultiArrowMode = false;
        noteArea.classList.remove('multi-arrow-mode');
        updateToolbarState();
    }


    // =================================================================
    // 9. FEATURE: IMAGES
    // =================================================================
    function renderImages() { 
        canvasContent.querySelectorAll('.image-wrapper').forEach(el => el.remove()); 
        const page = appData.pages?.[appData.currentPageId]; 
        if (!page || !page.images) return; 
        page.images.forEach(imgData => { 
            const wrapper = document.createElement('div'); 
            wrapper.id = imgData.id; 
            wrapper.className = 'image-wrapper'; 
            wrapper.style.left = `${imgData.x}px`; 
            wrapper.style.top = `${imgData.y}px`; 
            wrapper.style.width = `${imgData.width}px`; 
            wrapper.style.height = `${imgData.height}px`; 
            const imgEl = document.createElement('img'); 
            imgEl.src = imgData.src; 
            wrapper.appendChild(imgEl); 
            
            wrapper.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (isEraserMode) { deleteImageById(imgData.id); return; }
                if (isFocusApplied) { if (!focusedElements.has(imgData.id)) return; } 
                else if (isFocusModeActive) return;
                isImageJustDragged = false;
                selectImage(imgData.id);
                isImageDragging = true;
                draggedImageWrapper = document.getElementById(imgData.id);
                if (!draggedImageWrapper) return;
                const startCoords = getCanvasCoordinates(e);
                imageDragOffset.x = startCoords.x - draggedImageWrapper.offsetLeft;
                imageDragOffset.y = startCoords.y - draggedImageWrapper.offsetTop;
                dragStartPos = startCoords;
            });

            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isImageJustDragged) return;
                if (isFocusModeActive) { applyFocus(imgData.id); return; }
                if (isArrowMode) handleArrowModeClick(wrapper);
                else if (isTextLinkMode && textLinkStartInfo) handleConnectionEnd(wrapper);
                else if (isMultiArrowMode) handleMultiArrowStart(wrapper);
            });
            
            if (imgData.id === selectedImageId) { 
                wrapper.classList.add('selected'); 
                ['nw', 'ne', 'sw', 'se'].forEach(type => { 
                    const handle = document.createElement('div'); 
                    handle.className = `resize-handle ${type}`; 
                    handle.addEventListener('mousedown', (e) => { 
                        e.stopPropagation(); 
                        isResizing = true; 
                        resizeHandleType = type; 
                        draggedImageWrapper = wrapper; 
                        dragStartPos = getCanvasCoordinates(e); 
                    }); 
                    wrapper.appendChild(handle); 
                }); 
            } 
            canvasContent.appendChild(wrapper); 
        }); 
    }
    
    function selectImage(imgId) { 
        selectedConnectorId = null; 
        if(activeTextBox) activeTextBox.blur();
        selectedStickerId = null;
        selectedImageId = imgId; 
        render(); 
    }
    
    function deleteSelectedImage() { 
        if (!selectedImageId) return; 
        deleteImageById(selectedImageId);
    }

    function deleteImageById(imgId) {
        if (!imgId) return;
        const page = appData.pages[appData.currentPageId];
        if (page && page.images) {
            page.images = page.images.filter(img => img.id !== imgId);
            if (selectedImageId === imgId) selectedImageId = null;
            document.getElementById(imgId)?.remove();
            renderConnectorsAndLabels();
            debouncedSaveState();
        }
    }


    // =================================================================
    // 10. FEATURE: STICKERS
    // =================================================================
    function renderStickers() {
        canvasContent.querySelectorAll('.sticker-wrapper').forEach(el => el.remove());
        const page = appData.pages?.[appData.currentPageId];
        if (!page || !page.stickers) return;

        page.stickers.forEach(stickerData => {
            const wrapper = document.createElement('div');
            wrapper.id = stickerData.id;
            wrapper.className = 'sticker-wrapper';
            wrapper.style.left = `${stickerData.x}px`;
            wrapper.style.top = `${stickerData.y}px`;
            wrapper.style.fontSize = `${stickerData.size}px`;
            wrapper.textContent = stickerData.type;

            wrapper.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (isEraserMode) { deleteStickerById(stickerData.id); return; }
                selectSticker(stickerData.id);
                isStickerDragging = true;
                draggedStickerWrapper = document.getElementById(stickerData.id);
                if (!draggedStickerWrapper) return;
                const startCoords = getCanvasCoordinates(e);
                stickerDragOffset.x = startCoords.x - draggedStickerWrapper.offsetLeft;
                stickerDragOffset.y = startCoords.y - draggedStickerWrapper.offsetTop;
            });

            if (stickerData.id === selectedStickerId) {
                wrapper.classList.add('selected');
                ['nw', 'ne', 'sw', 'se'].forEach(type => {
                    const handle = document.createElement('div');
                    handle.className = `resize-handle ${type}`;
                    handle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        isStickerResizing = true;
                        resizeHandleType = type;
                        draggedStickerWrapper = wrapper;
                        dragStartPos = getCanvasCoordinates(e);
                    });
                    wrapper.appendChild(handle);
                });
            }
            canvasContent.appendChild(wrapper);
        });
    }

    function selectSticker(stickerId) {
        if(activeTextBox) activeTextBox.blur();
        selectedImageId = null;
        selectedConnectorId = null;
        selectedStickerId = stickerId;
        render();
    }
    
    function deleteSelectedSticker() {
        if (!selectedStickerId) return;
        deleteStickerById(selectedStickerId);
    }

    function deleteStickerById(stickerId) {
        if (!stickerId) return;
        const page = appData.pages[appData.currentPageId];
        if (page && page.stickers) {
            page.stickers = page.stickers.filter(s => s.id !== stickerId);
            if (selectedStickerId === stickerId) selectedStickerId = null;
            document.getElementById(stickerId)?.remove();
            debouncedSaveState();
        }
    }


    // =================================================================
    // 11. FEATURE: DRAWING
    // =================================================================
    function renderShapes() { 
        const svg = drawingCanvas; if (!svg) return;
        svg.innerHTML = '<defs></defs>';
        const defs = svg.querySelector('defs');
        const page = appData.pages?.[appData.currentPageId]; if (!page || !page.shapes) return; 

        page.shapes.forEach(shapeData => { 
            const shapeEl = document.createElementNS('http://www.w3.org/2000/svg', shapeData.type);
            shapeEl.setAttribute('id', shapeData.id); 
            shapeEl.classList.add('drawn-path'); 
            shapeEl.setAttribute('stroke', hexToRgba(shapeData.stroke, shapeData.opacity)); 
            shapeEl.setAttribute('stroke-width', shapeData.strokeWidth); 
            
            if (shapeData.type === 'path') shapeEl.setAttribute('d', shapeData.d);
            else if (shapeData.type === 'rect') {
                shapeEl.setAttribute('x', shapeData.x); shapeEl.setAttribute('y', shapeData.y);
                shapeEl.setAttribute('width', shapeData.width); shapeEl.setAttribute('height', shapeData.height);
            } else if (shapeData.type === 'ellipse') {
                shapeEl.setAttribute('cx', shapeData.cx); shapeEl.setAttribute('cy', shapeData.cy);
                shapeEl.setAttribute('rx', shapeData.rx); shapeEl.setAttribute('ry', shapeData.ry);
            }

            if (shapeData.fillType === 'solid') shapeEl.setAttribute('fill', hexToRgba(shapeData.fill, shapeData.opacity));
            else if (shapeData.fillType) {
                const patternId = `pattern-${shapeData.fillType}-${shapeData.fill.replace('#','')}`;
                if (!defs.querySelector(`#${patternId}`)) {
                    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
                    pattern.setAttribute('id', patternId); pattern.setAttribute('patternUnits', 'userSpaceOnUse');
                    if (shapeData.fillType === 'stripes') {
                        pattern.setAttribute('width', '10'); pattern.setAttribute('height', '10');
                        pattern.innerHTML = `<path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="${shapeData.fill}" stroke-width="2"/>`;
                    } else if (shapeData.fillType === 'dots') {
                        pattern.setAttribute('width', '10'); pattern.setAttribute('height', '10');
                        pattern.innerHTML = `<circle cx="5" cy="5" r="2" fill="${shapeData.fill}"/>`;
                    }
                    defs.appendChild(pattern);
                }
                shapeEl.setAttribute('fill', `url(#${patternId})`);
                shapeEl.style.fillOpacity = shapeData.opacity;
            } else shapeEl.setAttribute('fill', 'none');
            svg.appendChild(shapeEl); 
        }); 
    }

    function deleteShape(shapeId) { 
        const page = appData.pages[appData.currentPageId]; 
        if (page && page.shapes) { 
            const initialLength = page.shapes.length; 
            page.shapes = page.shapes.filter(s => s.id !== shapeId); 
            if(page.shapes.length < initialLength) { 
                document.getElementById(shapeId)?.remove(); 
                return true; 
            } 
        } 
        return false; 
    }


    // =================================================================
    // 12. FEATURE: MEMO
    // =================================================================
    function renderMemo() {
        memoContainer.innerHTML = '';
        const page = appData.pages?.[appData.currentPageId];
        if (page && page.memo) createMemoElement(page.memo);
    }

// --- 変更後: createMemoElement 開始 ---
    function createMemoElement(memoData) {
        const memo = document.createElement('div');
        memo.id = memoData.id;
        memo.className = 'memo';
        memo.style.left = `${memoData.x}px`;
        memo.style.top = `${memoData.y}px`;
        memo.style.width = `${memoData.width}px`;
        memo.style.height = `${memoData.height}px`;

        const header = document.createElement('div');
        header.className = 'memo-header';
        
        const content = document.createElement('div');
        content.className = 'memo-content';
        content.contentEditable = true;
        content.innerHTML = memoData.html;

        memo.appendChild(header);
        memo.appendChild(content);
        memoContainer.appendChild(memo);

        header.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isMemoDragging = true;
            draggedMemo = memo;
            memoDragOffset.x = e.clientX - memo.offsetLeft;
            memoDragOffset.y = e.clientY - memo.offsetTop;
        });

        content.addEventListener('mousedown', (e) => e.stopPropagation());

        const saveMemoChanges = () => {
            // ★ここからが修正箇所です
            // 要素が非表示などの理由でサイズが0の場合は、データを保存せずに処理を中断する
            if (memo.offsetWidth === 0 || memo.offsetHeight === 0) {
                return;
            }
            // ★ここまでが修正箇所です

            const page = appData.pages[appData.currentPageId];
            if(page.memo) {
                page.memo.html = content.innerHTML;
                page.memo.width = memo.offsetWidth;
                page.memo.height = memo.offsetHeight;
                debouncedSaveState();
            }
        };

        content.addEventListener('blur', saveMemoChanges);
        new ResizeObserver(saveMemoChanges).observe(memo);
    }
// --- 変更後: createMemoElement 終了 ---

// --- 変更後: toggleMemo 開始 ---
    function toggleMemo() {
        memoContainer.classList.toggle('hidden');
        localStorage.setItem('myNoteAppV17_memoHidden', memoContainer.classList.contains('hidden'));

        // メモが表示される状態になった場合
        if (!memoContainer.classList.contains('hidden')) {
            const page = appData.pages[appData.currentPageId];
            // もし、このページにまだメモのデータが存在しないなら、ここで作成する
            if (page && !page.memo) {
                page.memo = { id: `memo-${appData.currentPageId}`, x: 50, y: 50, width: 200, height: 180, html: '' };
                debouncedSaveState();
            }
            // ★ここからが修正箇所です
            // 必ずメモの描画処理を呼び出す
            renderMemo();
            // ★ここまでが修正箇所です
        }
    }
// --- 変更後: toggleMemo 終了 ---

        // [後半はここから]

    // =================================================================
    // 13. FEATURE: STATISTICS
    // =================================================================
    function updateStatsPanel() {
        const page = appData.pages?.[appData.currentPageId];
        if (!page) {
            totalItemsStat.textContent = '0';
            todayItemsStat.textContent = '0';
            totalLengthStat.textContent = '0.0';
            lengthComparisonStat.textContent = '...';
            return;
        }
        const isToday = (timestamp) => {
            if (!timestamp) return false;
            const today = new Date(); const date = new Date(timestamp);
            return today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() === date.getDate();
        };
        const allItems = [...(page.content || []), ...(page.images || [])];
        const totalItems = allItems.length;
        const todayItems = allItems.filter(item => isToday(item.createdAt)).length;
        const totalChars = (page.content || []).reduce((sum, box) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = box.html;
            return sum + (tempDiv.textContent || tempDiv.innerText || '').length;
        }, 0);
        const totalCm = totalChars * 0.4;
        const comparisons = [ { threshold: 0, text: '書くのだ...' }, { threshold: 4.8, text: '消しゴム' }, { threshold: 10, text: 'りんご' }, { threshold: 18, text: 'リス' }, { threshold: 30, text: 'A4用紙' }, { threshold: 50, text: 'ネコ' }, { threshold: 80, text: 'ゴルフクラブ' }, { threshold: 100, text: 'カピバラ' }, { threshold: 130, text: '子供の身長' }, { threshold: 165, text: '大人の身長' }, { threshold: 200, text: 'NBA選手' }, { threshold: 250, text: '電話ボックス' }, { threshold: 300, text: 'キリン' }, { threshold: 500, text: '小型の巨人' }, { threshold: 700, text: 'サッカーゴール幅' }, { threshold: 860, text: 'マーライオン' }, { threshold: 1000, text: 'バス' }, { threshold: 1500, text: '5階建てマンション' }, { threshold: 1982, text: '札幌市時計台' }, { threshold: 2400, text: 'シロナガスクジラ雄' }, { threshold: 2980, text: '横浜アリーナ地上高' }, { threshold: 10000, text: 'サッカーゴールの横幅の13倍' } ];
        let comparisonText = comparisons[0].text;
        for (const comp of comparisons) { if (totalCm >= comp.threshold) comparisonText = comp.text; else break; }
        totalItemsStat.textContent = totalItems.toLocaleString();
        todayItemsStat.textContent = todayItems.toLocaleString();
        totalLengthStat.textContent = totalCm.toFixed(1);
        lengthComparisonStat.textContent = comparisonText;
    }


    // =================================================================
    // 14. FEATURE: FOCUS MODE
    // =================================================================
    function toggleFocusMode() {
        if (isFocusApplied) clearFocus();
        else isFocusModeActive = !isFocusModeActive;
        noteArea.classList.toggle('focus-mode-active', isFocusModeActive);
        updateToolbarState();
    }

    function findDownstreamElements(elementId, allElementIds, visited) {
        if (visited.has(elementId)) return;
        visited.add(elementId);
        allElementIds.add(elementId);
        const page = appData.pages[appData.currentPageId];
        if (!page || !page.connectors) return;
        const outgoingConnectors = page.connectors.filter(c => c.startBoxId === elementId);
        for (const conn of outgoingConnectors) {
            if (visited.has(conn.id)) continue;
            visited.add(conn.id);
            allElementIds.add(conn.id);
            const branchedConnectors = page.connectors.filter(branch => branch.branchPoint && branch.branchPoint.parentId === conn.id);
            for (const branch of branchedConnectors) {
                if (!visited.has(branch.id)) {
                    visited.add(branch.id);
                    allElementIds.add(branch.id);
                    if (branch.endBoxId) findDownstreamElements(branch.endBoxId, allElementIds, visited);
                }
            }
            if (conn.endBoxId) findDownstreamElements(conn.endBoxId, allElementIds, visited);
        }
    }

    function applyFocus(startElementId) {
        isFocusModeActive = false;
        isFocusApplied = true;
        noteArea.classList.remove('focus-mode-active');
        focusedElements.clear();
        const visited = new Set();
        findDownstreamElements(startElementId, focusedElements, visited);
        document.body.classList.add('focus-mode');
        focusedElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('focused');
            const connGroup = connectorCanvas.querySelector(`.connector-group[data-conn-id="${id}"]`);
            if (connGroup) {
                connGroup.classList.add('focused');
                const connLabel = canvasContent.querySelector(`#label-${id}`);
                if (connLabel) connLabel.classList.add('focused');
            }
        });
        updateToolbarState();
    }

    function clearFocus() {
        isFocusModeActive = false;
        isFocusApplied = false;
        if(isArrowMode) {
            isArrowMode = false;
            arrowStartPoint = null;
            noteArea.classList.remove('arrow-mode');
        }
        document.body.classList.remove('focus-mode');
        canvasContent.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));
        connectorCanvas.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));
        focusedElements.clear();
        updateToolbarState();
    }


    // =================================================================
    // 15. TOOLBOXES & MODALS SETUP
    // =================================================================
    function turnOffOtherModes(currentMode) {
        if (currentMode !== 'arrow') { isArrowMode = false; arrowStartPoint = null; }
        if (currentMode !== 'textLink') { isTextLinkMode = false; textLinkStartInfo = null; }
        if (currentMode !== 'draw') { isDrawingMode = false; if(drawingToolbox) drawingToolbox.classList.add('hidden'); }
        if (currentMode !== 'multiArrow') { isMultiArrowMode = false; multiArrowStartBoxId = null; }
        if (currentMode !== 'border') { isBorderMode = false; }
        if (currentMode !== 'bgColor') { isBgColorMode = false; }
        if (currentMode !== 'eraser') { isEraserMode = false; }
        if (currentMode !== 'sticker') { isStickerMode = false; selectedStickerType = null; if(stickerToolbox) stickerToolbox.classList.add('hidden'); }
        if (currentMode !== 'focus') { if (isFocusApplied) clearFocus(); isFocusModeActive = false; }
        noteArea.className = 'note-area';
    }

    function clearAllSelectionsAndModes() {
        if (activeTextBox) activeTextBox.blur();
        if (selectedConnectorId) selectConnector(selectedConnectorId);
        if (selectedImageId) selectedImageId = null;
        if (selectedStickerId) selectedStickerId = null;
        turnOffOtherModes('none');
        updateToolbarState();
        renderConnectorsAndLabels();
        renderImages();
        renderStickers();
    }
    
    function setupInlineToolbox() {
        const generateColorSwatches = (colors, target) => colors.map(c => `<div class="color-swatch" data-target="${target}" data-color="${c}" style="background-color: ${c};"></div>`).join('');
        const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]; 
        let fontSizeOptionsHTML = fontSizes.map(s => `<option value="${s}">${s}</option>`).join(''); 
        inlineToolbox.innerHTML = ` <button data-command="bold" title="太字"><b>B</b></button> <button data-command="underline" title="下線"><u>U</u></button> <div class="color-dropdown"><button class="color-dropdown-button" data-command="toggleColor" data-target="text" title="文字色">A</button><div class="color-palette hidden">${generateColorSwatches(BASE_COLORS, 'text')}</div></div> <div class="divider"></div> <select id="font-size-selector" title="フォントサイズ">${fontSizeOptionsHTML}</select>`; 
        inlineToolbox.addEventListener('mousedown', (e) => { clearTimeout(hideToolboxTimeout); const targetTag = e.target.tagName.toLowerCase(); if (targetTag !== 'select' && targetTag !== 'option') e.preventDefault(); }); 
        inlineToolbox.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target; if (!activeTextBox) return; if (target.dataset.command === 'toggleColor') { const palette = target.nextElementSibling; const isHidden = palette.classList.contains('hidden'); inlineToolbox.querySelectorAll('.color-palette').forEach(p => p.classList.add('hidden')); if(isHidden) palette.classList.remove('hidden'); return; } if (target.classList.contains('color-swatch')) { const targetType = target.dataset.target; const color = target.dataset.color; if (targetType === 'text') applyStyle('foreColor', color); target.parentElement.classList.add('hidden'); updateInlineToolboxState(); activeTextBox.dispatchEvent(new Event('input', { bubbles: true })); return; } const commandTarget = target.closest('[data-command]'); if (commandTarget) { document.execCommand(commandTarget.dataset.command, false, null); updateInlineToolboxState(); activeTextBox.dispatchEvent(new Event('input', { bubbles: true })); } }); 
        document.getElementById('font-size-selector').addEventListener('change', (e) => { applyFontSize(e.target.value); activeTextBox.dispatchEvent(new Event('input', { bubbles: true })); }); 
    }

    function setupLinkToolbox() {
        linkToolbox.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target.closest('button[data-style]');
            if (target && selectedConnectorId) {
                const style = target.dataset.style;
                const page = appData.pages[appData.currentPageId];
                const connector = page.connectors.find(c => c.id === selectedConnectorId);
                if (connector) {
                    connector.linkStyle = style;
                    debouncedSaveState();
                    renderConnectorsAndLabels();
                    const group = connectorCanvas.querySelector(`.connector-group[data-conn-id="${selectedConnectorId}"]`);
                    if (group) showLinkToolbox(selectedConnectorId, group);
                }
            }
        });
    }

    function setupLineColorToolbox() { 
        lineColorPalette.innerHTML = BASE_COLORS.map(c => `<div class="color-swatch" data-color="${c}" style="background-color: ${c};"></div>`).join(''); 
        lineColorBtn.style.color = currentLineColor; 
        lineColorBtn.addEventListener('click', (e) => { e.stopPropagation(); lineColorPalette.classList.toggle('hidden'); }); 
        lineColorPalette.addEventListener('click', (e) => { const swatch = e.target.closest('.color-swatch'); if (!swatch) return; e.stopPropagation(); const color = swatch.dataset.color; currentLineColor = color; lineColorBtn.style.color = color; lineColorPalette.classList.add('hidden'); if (selectedConnectorId) { const page = appData.pages[appData.currentPageId]; const connector = page.connectors.find(c => c.id === selectedConnectorId); if (connector) { connector.color = color; debouncedSaveState(); renderConnectorsAndLabels(); } } }); 
    }

    function setupDrawingTools() {
        drawToolBtn.addEventListener('click', () => {
            const wasActive = isDrawingMode;
            turnOffOtherModes('draw'); 
            isDrawingMode = !wasActive; 
            drawingToolbox.classList.toggle('hidden', !isDrawingMode);
            noteArea.classList.toggle('drawing-mode', isDrawingMode && currentDrawingTool !== 'eraser');
            noteArea.classList.toggle('eraser-mode', isDrawingMode && currentDrawingTool === 'eraser');
            updateToolbarState();
        });
        drawingToolbox.addEventListener('click', (e) => { 
            const toolBtn = e.target.closest('.draw-tool'); 
            if (toolBtn) { 
                drawingToolbox.querySelector('.draw-tool.active')?.classList.remove('active'); 
                toolBtn.classList.add('active'); 
                currentDrawingTool = toolBtn.dataset.tool; 
                noteArea.classList.toggle('drawing-mode', isDrawingMode && currentDrawingTool !== 'eraser'); 
                noteArea.classList.toggle('eraser-mode', isDrawingMode && currentDrawingTool === 'eraser'); 
            }
            const patternBtn = e.target.closest('.fill-pattern-btn');
            if (patternBtn) {
                drawingToolbox.querySelector('.fill-pattern-btn.active')?.classList.remove('active');
                patternBtn.classList.add('active');
                currentDrawingStyle.fillType = patternBtn.dataset.fillType;
            }
        });
        document.getElementById('draw-stroke-width-picker').addEventListener('input', (e) => { currentDrawingStyle.strokeWidth = e.target.value; });
        document.getElementById('draw-opacity-picker').addEventListener('input', (e) => { currentDrawingStyle.opacity = parseFloat(e.target.value); });
        const drawColorPalette = document.getElementById('draw-color-palette');
        const drawColorBtn = document.getElementById('draw-color-btn');
        drawColorPalette.innerHTML = BASE_COLORS.map(c => `<div class="color-swatch" data-color="${c}" style="background-color: ${c};"></div>`).join('');
        drawColorBtn.style.backgroundColor = currentDrawingStyle.stroke;
        drawColorBtn.addEventListener('click', (e) => { e.stopPropagation(); drawColorPalette.classList.toggle('hidden'); });
        drawColorPalette.addEventListener('click', (e) => { const swatch = e.target.closest('.color-swatch'); if (!swatch) return; e.stopPropagation(); const color = swatch.dataset.color; currentDrawingStyle.stroke = color; drawColorBtn.style.backgroundColor = color; drawColorPalette.classList.add('hidden'); });
    }

    function setupStickerTools() {
        const stickers = ['❤', '👍', '😊', '😂', '🤔', '💡', '✨', '🎉', '🚀', '🎯', '🔥', '✅'];
        const stickerOptionsContainer = document.getElementById('sticker-options');
        stickerOptionsContainer.innerHTML = stickers.map(s => `<div class="sticker-option" data-sticker="${s}">${s}</div>`).join('');
        stickerToolBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isStickerMode = !isStickerMode;
            turnOffOtherModes('sticker');
            stickerToolbox.classList.toggle('hidden', !isStickerMode);
            noteArea.classList.toggle('sticker-mode', isStickerMode);
            if (!isStickerMode) {
                selectedStickerType = null;
                const currentActive = stickerOptionsContainer.querySelector('.active');
                if (currentActive) currentActive.classList.remove('active');
            }
            updateToolbarState();
        });
        stickerOptionsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.sticker-option');
            if (target && isStickerMode) {
                const currentActive = stickerOptionsContainer.querySelector('.active');
                if (currentActive) currentActive.classList.remove('active');
                target.classList.add('active');
                selectedStickerType = target.dataset.sticker;
            }
        });
    }
        
    function setupImagePlacement() {
        if (!addImageBtn) { console.error("Could not find #add-image-btn element."); return; }
        addImageBtn.addEventListener('click', () => { if (imageInput) imageInput.click(); });
        if (!imageInput) { console.error("Could not find #image-input element."); return; }
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const page = appData.pages[appData.currentPageId];
                    const coords = { x: noteArea.scrollLeft / currentZoom + (noteArea.clientWidth / 2 / currentZoom) - 150, y: noteArea.scrollTop / currentZoom + (noteArea.clientHeight / 2 / currentZoom) - 100 };
                    const newImageData = { id: `img-${Date.now()}`, src: event.target.result, x: coords.x, y: coords.y, width: 300, height: 200, createdAt: Date.now() };
                    if (!page.images) page.images = [];
                    page.images.push(newImageData);
                    checkAndExpandCanvas(newImageData.x, newImageData.y);
                    debouncedSaveState();
                    render();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            imageInput.value = '';
        });
    }

    function setupMultiArrowModal() {
        const closeModal = () => { modalOverlay.classList.add('hidden'); multiArrowTextarea.value = ''; multiArrowStartBoxId = null; };
        cancelMultiArrowBtn.addEventListener('click', closeModal);
        createMultiArrowBtn.addEventListener('click', () => {
            const page = appData.pages[appData.currentPageId];
            const startElement = document.getElementById(multiArrowStartBoxId);
            if (!page || !startElement) { closeModal(); return; }
            const items = multiArrowTextarea.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            if (items.length === 0) { closeModal(); return; }
            const startRect = { x: startElement.offsetLeft, y: startElement.offsetTop, width: startElement.offsetWidth, height: startElement.offsetHeight };
            const centerX = startRect.x + startRect.width / 2; const centerY = startRect.y + startRect.height / 2;
            const itemCount = items.length; const boxWidth = 150; const boxHeight = 40; const boxGap = 40;
            const effectiveBoxSize = Math.max(boxWidth, boxHeight) + boxGap; const circumference = itemCount * effectiveBoxSize;
            let radius = circumference / (2 * Math.PI); const minRadius = Math.max(startRect.width, startRect.height) / 2 + boxWidth;
            radius = Math.max(radius, minRadius); const angleStep = (2 * Math.PI) / itemCount;
            items.forEach((item, index) => {
                const angle = angleStep * index - (Math.PI / 2);
                const newBoxX = centerX + radius * Math.cos(angle) - boxWidth / 2;
                const newBoxY = centerY + radius * Math.sin(angle) - boxHeight / 2;
                const newBoxData = { id: `box-${Date.now()}-${index}`, x: newBoxX, y: newBoxY, html: item, isBordered: false, borderColor: '#333333', backgroundColor: '', createdAt: Date.now() };
                page.content.push(newBoxData);
                checkAndExpandCanvas(newBoxData.x, newBoxData.y);
                const newConnectorData = { id: `conn-${Date.now()}-${index}`, type: 'box', startBoxId: multiArrowStartBoxId, endBoxId: newBoxData.id, label: '', color: currentLineColor, linkStyle: 'solid' };
                page.connectors.push(newConnectorData);
            });
            closeModal(); debouncedSaveState(); renderCurrentPage();
        });
    }

    function showInlineToolbox(textBox) { clearTimeout(hideToolboxTimeout); inlineToolbox.classList.remove('hidden'); const boxRect = textBox.getBoundingClientRect(); inlineToolbox.style.top = `${boxRect.top - inlineToolbox.offsetHeight - 5}px`; inlineToolbox.style.left = `${boxRect.left}px`; updateInlineToolboxState(); }
    function hideInlineToolbox() { inlineToolbox.classList.add('hidden'); inlineToolbox.querySelectorAll('.color-palette').forEach(p => p.classList.add('hidden')); }
    function updateInlineToolboxState() { if (!activeTextBox) return; inlineToolbox.querySelector('[data-command="bold"]').classList.toggle('active', document.queryCommandState('bold')); inlineToolbox.querySelector('[data-command="underline"]').classList.toggle('active', document.queryCommandState('underline')); const fontColor = document.queryCommandValue('foreColor'); inlineToolbox.querySelector('.color-dropdown-button[data-target="text"]').style.color = fontColor; const fontSizeSelector = document.getElementById('font-size-selector'); const selection = window.getSelection(); if (selection.rangeCount > 0) { let parentElement = selection.anchorNode; if (parentElement.nodeType === 3) parentElement = parentElement.parentNode; let currentFontSize = null; let elementToCheck = parentElement; while (elementToCheck && elementToCheck !== activeTextBox.parentNode) { if (elementToCheck.style && elementToCheck.style.fontSize) { currentFontSize = elementToCheck.style.fontSize; break; } if(elementToCheck === activeTextBox && activeTextBox.style.fontSize){ currentFontSize = activeTextBox.style.fontSize; break; } elementToCheck = elementToCheck.parentNode; } if (currentFontSize) fontSizeSelector.value = parseInt(currentFontSize, 10); else { const defaultSize = window.getComputedStyle(activeTextBox).fontSize; fontSizeSelector.value = parseInt(defaultSize, 10); } } }
    function applyStyle(style, value) { if (!activeTextBox) return; activeTextBox.focus(); if (style === 'foreColor') document.execCommand('foreColor', false, value); updateInlineToolboxState(); activeTextBox.dispatchEvent(new Event('input', { bubbles: true })); }
    function applyFontSize(size) { if (!activeTextBox) return; activeTextBox.focus(); const selection = window.getSelection(); if (!selection.rangeCount) return; const range = selection.getRangeAt(0); const sizePx = size + 'px'; if (range.collapsed) { const span = document.createElement('span'); span.style.fontSize = sizePx; span.innerHTML = '​'; range.insertNode(span); range.setStart(span, 1); range.setEnd(span, 1); selection.removeAllRanges(); selection.addRange(range); updateInlineToolboxState(); return; } try { const fragment = range.extractContents(); const elements = fragment.querySelectorAll('*'); elements.forEach(el => { el.style.fontSize = sizePx; }); Array.from(fragment.childNodes).forEach(node => { if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') { const span = document.createElement('span'); span.style.fontSize = sizePx; span.textContent = node.textContent; node.parentNode.replaceChild(span, node); } }); const firstNode = fragment.firstChild; const lastNode = fragment.lastChild; range.insertNode(fragment); if (firstNode) { range.setStartBefore(firstNode); range.setEndAfter(lastNode); selection.removeAllRanges(); selection.addRange(range); } } catch (e) { console.error("フォントサイズの適用に失敗しました: ", e); } finally { updateInlineToolboxState(); } }
    function showLinkToolbox(connectorId, groupElement) { hideInlineToolbox(); const page = appData.pages[appData.currentPageId]; const connector = page.connectors.find(c => c.id === connectorId); if (!connector) return; linkToolbox.classList.remove('hidden'); const groupRect = groupElement.getBoundingClientRect(); linkToolbox.style.top = `${groupRect.top + groupRect.height / 2 - linkToolbox.offsetHeight - 10}px`; linkToolbox.style.left = `${groupRect.left + groupRect.width / 2 - linkToolbox.offsetWidth / 2}px`; linkToolbox.querySelectorAll('button').forEach(btn => { btn.classList.toggle('active', btn.dataset.style === (connector.linkStyle || 'solid')); }); }
    function hideLinkToolbox() { linkToolbox.classList.add('hidden'); }


    // =================================================================
    // 16. EVENT LISTENERS
    // =================================================================
    noteArea.addEventListener('mousedown', e => {
        e.stopPropagation();
        if (isEraserMode && e.target.classList.contains('drawn-path')) { deleteShape(e.target.id); debouncedSaveState(); return; }
        if (isFocusModeActive) return;
        if (isDrawingMode) {
            if (e.target.closest('.textbox') || e.target.closest('.connector-group') || e.target.closest('.connector-label') || e.target.closest('.image-wrapper')) { return; }
            isDragCandidate = false;
            const coords = getCanvasCoordinates(e);
            const commonShapeData = { id: `shape-${Date.now()}`, type: currentDrawingTool, stroke: currentDrawingStyle.stroke, strokeWidth: currentDrawingStyle.strokeWidth, opacity: currentDrawingStyle.opacity, fill: 'none', fillType: 'none', startX: coords.x, startY: coords.y };
            if (currentDrawingTool === 'freehand' || currentDrawingTool === 'lasso-fill') {
                isDrawing = true; currentShapeData = { ...commonShapeData, type: 'path', d: `M ${coords.x} ${coords.y}` };
                if (currentDrawingTool === 'lasso-fill') { currentShapeData.fill = currentDrawingStyle.stroke; currentShapeData.fillType = currentDrawingStyle.fillType; }
            } else if (currentDrawingTool === 'rectangle' || currentDrawingTool === 'ellipse') {
                isDrawing = true; currentShapeData = { ...commonShapeData, fill: currentDrawingStyle.stroke, fillType: currentDrawingStyle.fillType };
                if (currentDrawingTool === 'rectangle') currentShapeData.type = 'rect';
            } else if (currentDrawingTool === 'eraser') {
                isDrawing = false; isErasing = true;
                if (e.target.classList.contains('drawn-path')) deleteShape(e.target.id);
            }
            if(isDrawing) {
                const previewEl = document.createElementNS('http://www.w3.org/2000/svg', currentShapeData.type);
                previewEl.setAttribute('id', 'drawing-preview'); previewEl.setAttribute('stroke', hexToRgba(currentShapeData.stroke, currentShapeData.opacity)); previewEl.setAttribute('stroke-width', currentShapeData.strokeWidth); previewEl.setAttribute('fill', 'none');
                if (currentDrawingTool === 'lasso-fill' || currentDrawingTool === 'rectangle' || currentDrawingTool === 'ellipse') previewEl.setAttribute('fill', hexToRgba(currentShapeData.fill, currentShapeData.opacity * 0.3));
                previewEl.classList.add('drawn-path'); drawingCanvas.appendChild(previewEl);
            }
            return;
        }
        if (e.target.closest('.connector-group') || e.target.closest('.image-wrapper') || e.target.closest('.sticker-wrapper')) return;
        if (e.target.closest('.textbox')) { isDragCandidate = true; draggedBox = e.target.closest('.textbox'); dragStartPos = { x: e.clientX, y: e.clientY }; return; }
        if (e.target === canvasContent || e.target === noteArea || e.target === drawingCanvas || e.target === connectorCanvas) {
            if (selectedConnectorId) selectConnector(selectedConnectorId);
            if (selectedImageId) { selectedImageId = null; render(); }
            if (selectedStickerId) { selectedStickerId = null; render(); }
            if (activeTextBox) activeTextBox.blur();
            isClickCandidate = true; dragStartPos = { x: e.clientX, y: e.clientY }; panStartScroll = { left: noteArea.scrollLeft, top: noteArea.scrollTop };
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDrawing && !isErasing && !isImageDragging && !isResizing && !isStickerDragging && !isStickerResizing && !isDragCandidate && !isClickCandidate && !isDragging && !isPanning && !isToolboxDragging && !isMemoDragging) return;
        if (isDrawing) { 
            const coords = getCanvasCoordinates(e); const previewEl = document.getElementById('drawing-preview'); if (!previewEl) return;
            const x1 = currentShapeData.startX, y1 = currentShapeData.startY, x2 = coords.x, y2 = coords.y;
            if (currentShapeData.type === 'path') {
                currentShapeData.d += ` L ${x2} ${y2}`; let d_str = currentShapeData.d; 
                if(currentDrawingTool === 'lasso-fill') d_str += ' Z'; previewEl.setAttribute('d', d_str);
            } else if (currentShapeData.type === 'rect') {
                previewEl.setAttribute('x', Math.min(x1, x2)); previewEl.setAttribute('y', Math.min(y1, y2));
                previewEl.setAttribute('width', Math.abs(x2 - x1)); previewEl.setAttribute('height', Math.abs(y2 - y1));
            } else if (currentShapeData.type === 'ellipse') {
                previewEl.setAttribute('cx', (x1 + x2) / 2); previewEl.setAttribute('cy', (y1 + y2) / 2);
                previewEl.setAttribute('rx', Math.abs(x2 - x1) / 2); previewEl.setAttribute('ry', Math.abs(y2 - y1) / 2);
            }
            return;
        }
        if (isErasing) { const hitTarget = e.target; if (hitTarget.classList.contains('drawn-path')) deleteShape(hitTarget.id); return; }
        if (isImageDragging && draggedImageWrapper) {
            isImageJustDragged = true; const coords = getCanvasCoordinates(e);
            const newX = coords.x - imageDragOffset.x; const newY = coords.y - imageDragOffset.y;
            draggedImageWrapper.style.left = `${newX}px`; draggedImageWrapper.style.top = `${newY}px`;
            renderConnectorsAndLabels(); return;
        }
        if (isResizing && draggedImageWrapper) { const coords = getCanvasCoordinates(e); const dx = coords.x - dragStartPos.x; const dy = coords.y - dragStartPos.y; const originalX = parseFloat(draggedImageWrapper.style.left); const originalY = parseFloat(draggedImageWrapper.style.top); const originalWidth = parseFloat(draggedImageWrapper.style.width); const originalHeight = parseFloat(draggedImageWrapper.style.height); if (resizeHandleType.includes('w')) { draggedImageWrapper.style.left = `${originalX + dx}px`; draggedImageWrapper.style.width = `${originalWidth - dx}px`; } if (resizeHandleType.includes('n')) { draggedImageWrapper.style.top = `${originalY + dy}px`; draggedImageWrapper.style.height = `${originalHeight - dy}px`; } if (resizeHandleType.includes('e')) { draggedImageWrapper.style.width = `${originalWidth + dx}px`; } if (resizeHandleType.includes('s')) { draggedImageWrapper.style.height = `${originalHeight + dy}px`; } dragStartPos = coords; renderConnectorsAndLabels(); return; }
        if (isStickerDragging && draggedStickerWrapper) { const coords = getCanvasCoordinates(e); draggedStickerWrapper.style.left = `${coords.x - stickerDragOffset.x}px`; draggedStickerWrapper.style.top = `${coords.y - stickerDragOffset.y}px`; return; }
        if (isStickerResizing && draggedStickerWrapper) {
            const coords = getCanvasCoordinates(e); const dx = coords.x - dragStartPos.x; const dy = coords.y - dragStartPos.y;
            const originalFontSize = parseFloat(draggedStickerWrapper.style.fontSize);
            const change = (resizeHandleType.includes('e') ? dx : dy);
            const newSize = Math.max(12, originalFontSize + change * 0.5);
            draggedStickerWrapper.style.fontSize = `${newSize}px`; dragStartPos = coords; return;
        }
        if (isDragCandidate) { if (draggedBox && !draggedBox.isContentEditable) { if (Math.abs(e.clientX - dragStartPos.x) > 5 || Math.abs(e.clientY - dragStartPos.y) > 5) { isDragging = true; isDragCandidate = false; if(draggedBox) draggedBox.classList.add('dragging'); hideInlineToolbox(); } } }
        if (isClickCandidate) { if (Math.abs(e.clientX - dragStartPos.x) > 5 || Math.abs(e.clientY - dragStartPos.y) > 5) { isPanning = true; isClickCandidate = false; noteArea.classList.add('panning'); } }
        if (isDragging && draggedBox) { const dx = (e.clientX - dragStartPos.x) / currentZoom; const dy = (e.clientY - dragStartPos.y) / currentZoom; draggedBox.style.left = `${parseFloat(draggedBox.style.left) + dx}px`; draggedBox.style.top = `${parseFloat(draggedBox.style.top) + dy}px`; dragStartPos = { x: e.clientX, y: e.clientY }; renderConnectorsAndLabels(); }
        if (isPanning) { const dx = e.clientX - dragStartPos.x; const dy = e.clientY - dragStartPos.y; noteArea.scrollLeft = panStartScroll.left - dx; noteArea.scrollTop = panStartScroll.top - dy; }
        if (isToolboxDragging) { floatingToolbox.style.left = `${e.clientX - toolboxOffsetX}px`; floatingToolbox.style.top = `${e.clientY - toolboxOffsetY}px`; }
        if (isMemoDragging && draggedMemo) { draggedMemo.style.left = `${e.clientX - memoDragOffset.x}px`; draggedMemo.style.top = `${e.clientY - memoDragOffset.y}px`; }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDrawing) {
            document.getElementById('drawing-preview')?.remove();
            const page = appData.pages[appData.currentPageId];
            const coords = getCanvasCoordinates(e);
            let shapeIsValid = false;
            if (currentShapeData.type === 'path') { if (currentDrawingTool === 'lasso-fill') currentShapeData.d += ' Z'; shapeIsValid = true; } 
            else if (currentShapeData.type === 'rect') {
                currentShapeData.x = Math.min(currentShapeData.startX, coords.x); currentShapeData.y = Math.min(currentShapeData.startY, coords.y);
                currentShapeData.width = Math.abs(coords.x - currentShapeData.startX); currentShapeData.height = Math.abs(coords.y - currentShapeData.startY);
                if (currentShapeData.width > 2 || currentShapeData.height > 2) shapeIsValid = true;
            } else if (currentShapeData.type === 'ellipse') {
                currentShapeData.cx = (currentShapeData.startX + coords.x) / 2; currentShapeData.cy = (currentShapeData.startY + coords.y) / 2;
                currentShapeData.rx = Math.abs(coords.x - currentShapeData.startX) / 2; currentShapeData.ry = Math.abs(coords.y - currentShapeData.startY) / 2;
                if (currentShapeData.rx > 1 || currentShapeData.ry > 1) shapeIsValid = true;
            }
            if (shapeIsValid) { page.shapes.push(currentShapeData); debouncedSaveState(); renderShapes(); }
            isDrawing = false; currentShapeData = null; return;
        }
        if (isErasing) { debouncedSaveState(); isErasing = false; return; }
        if (isImageDragging || isResizing) { if (draggedImageWrapper) { const page = appData.pages[appData.currentPageId]; const imgData = page.images.find(img => img.id === draggedImageWrapper.id); if(imgData){ imgData.x = parseFloat(draggedImageWrapper.style.left); imgData.y = parseFloat(draggedImageWrapper.style.top); imgData.width = parseFloat(draggedImageWrapper.style.width); imgData.height = parseFloat(draggedImageWrapper.style.height); checkAndExpandCanvas(imgData.x, imgData.y); debouncedSaveState(); } } }
        isImageDragging = false; isResizing = false; draggedImageWrapper = null;
        if (isStickerDragging || isStickerResizing) { if (draggedStickerWrapper) { const page = appData.pages[appData.currentPageId]; const stickerData = page.stickers.find(s => s.id === draggedStickerWrapper.id); if (stickerData) { stickerData.x = parseFloat(draggedStickerWrapper.style.left); stickerData.y = parseFloat(draggedStickerWrapper.style.top); stickerData.size = parseFloat(draggedStickerWrapper.style.fontSize); debouncedSaveState(); } } }
        isStickerDragging = false; isStickerResizing = false; draggedStickerWrapper = null;
        if (isDragging && draggedBox) { draggedBox.classList.remove('dragging'); const page = appData.pages[appData.currentPageId]; const boxData = page.content.find(box => box.id === draggedBox.id); if (boxData) { boxData.x = parseFloat(draggedBox.style.left); boxData.y = parseFloat(draggedBox.style.top); checkAndExpandCanvas(boxData.x, boxData.y); debouncedSaveState(); } }
        isDragCandidate = false; isDragging = false; draggedBox = null;
        if (isPanning) { isPanning = false; noteArea.classList.remove('panning'); }
        if (isClickCandidate) {
            isClickCandidate = false;
            if (e.target !== canvasContent && e.target !== noteArea && !e.target.closest('#connector-canvas') && e.target !== drawingCanvas) return;
            if (activeTextBox) activeTextBox.blur();
            const page = appData.pages[appData.currentPageId]; if (!page) return;
            const startInfo = (isArrowMode && arrowStartPoint) ? arrowStartPoint : ((isTextLinkMode && textLinkStartInfo) ? textLinkStartInfo : null);
            if (isStickerMode && selectedStickerType) {
                const coords = getCanvasCoordinates(e);
                const newSticker = { id: `sticker-${Date.now()}`, type: selectedStickerType, x: coords.x, y: coords.y, size: 48, createdAt: Date.now() };
                if(!page.stickers) page.stickers = [];
                page.stickers.push(newSticker); debouncedSaveState(); renderStickers(); return; 
            }
            if (startInfo) {
                if (!isArrowMode) { if (isTextLinkMode) { isTextLinkMode = false; textLinkStartInfo = null; noteArea.classList.remove('text-link-mode-linking'); } updateToolbarState(); }
                const coords = getCanvasCoordinates(e); createConnectedBoxWithLabelPrompt(startInfo, coords); arrowStartPoint = null; return;
            }
            if (!isArrowMode && !isTextLinkMode && !isDrawingMode && !isFocusModeActive && !isFocusApplied && !isEraserMode) {
                const coords = getCanvasCoordinates(e);
                const newBoxData = { id: `box-${Date.now()}`, x: coords.x, y: coords.y, html: '', isBordered: false, borderColor: '#333333', createdAt: Date.now() };
                if (!page.content) page.content = [];
                page.content.push(newBoxData); checkAndExpandCanvas(newBoxData.x, newBoxData.y); createTextBox(newBoxData, true); debouncedSaveState();
            }
        }
        if (isToolboxDragging) isToolboxDragging = false;
        if (isMemoDragging && draggedMemo) { const page = appData.pages[appData.currentPageId]; const memoData = page.memo; if (memoData) { memoData.x = draggedMemo.offsetLeft; memoData.y = draggedMemo.offsetTop; debouncedSaveState(); } }
        isMemoDragging = false; draggedMemo = null;
    });
        
    floatingToolbox.addEventListener('click', (e) => {
        const button = e.target.closest('button'); 
        if (!button || button.id === 'draw-tool-btn' || button.id === 'add-image-btn' || button.id === 'focus-mode-btn' || button.id === 'sticker-tool-btn') return; 
        if (isFocusApplied) {
            if (button.id === 'arrow-tool-btn') {
                isArrowMode = !isArrowMode;
                if (isArrowMode) noteArea.classList.add('arrow-mode');
                else { arrowStartPoint = null; noteArea.classList.remove('arrow-mode'); }
                updateToolbarState();
            }
            return;
        }
        if (button.id === 'arrow-tool-btn') { isArrowMode = !isArrowMode; turnOffOtherModes('arrow'); if (isArrowMode) noteArea.classList.add('arrow-mode'); }
        else if (button.id === 'text-link-tool-btn') { isTextLinkMode = !isTextLinkMode; turnOffOtherModes('textLink'); if(isTextLinkMode) noteArea.classList.add('text-link-mode'); }
        else if (button.id === 'multi-arrow-tool-btn') { isMultiArrowMode = !isMultiArrowMode; turnOffOtherModes('multiArrow'); if(isMultiArrowMode) noteArea.classList.add('multi-arrow-mode'); }
        else if (button.id === 'border-tool-btn') { isBorderMode = !isBorderMode; turnOffOtherModes('border'); if(isBorderMode) noteArea.classList.add('border-mode'); }
        else if (button.id === 'bg-color-btn') { isBgColorMode = !isBgColorMode; turnOffOtherModes('bgColor'); if(isBgColorMode) noteArea.classList.add('bg-color-mode'); }
        else if (button.id === 'eraser-tool-btn') { isEraserMode = !isEraserMode; turnOffOtherModes('eraser'); if(isEraserMode) noteArea.classList.add('eraser-mode'); }
        updateToolbarState();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); clearAllSelectionsAndModes(); return; }
        const isTextBoxEditing = document.activeElement && document.activeElement.closest('.textbox[contenteditable="true"]');
        const isLabelEditing = document.activeElement && document.activeElement.closest('.connector-label[contenteditable="true"]');
        const isImageSelected = !!selectedImageId;
        const canUseShortcut = isTextBoxEditing || isImageSelected;
        if (canUseShortcut && e.altKey && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            let startElement, startBoxId;
            if (isTextBoxEditing) {
                if (!activeTextBox) return;
                startBoxId = activeTextBox.id; 
                isSwitchingFocusProgrammatically = true; activeTextBox.blur(); isSwitchingFocusProgrammatically = false; 
                startElement = document.getElementById(startBoxId);
            } else { startBoxId = selectedImageId; startElement = document.getElementById(startBoxId); }
            if (!startElement) { isSwitchingFocusProgrammatically = false; return; }
            if (isFocusApplied && !focusedElements.has(startBoxId)) return;
            const startBoxRect = startElement.getBoundingClientRect(); const canvasRect = canvasContent.getBoundingClientRect();
            const startBoxCanvasPos = { x: (startBoxRect.left - canvasRect.left) / currentZoom, y: (startBoxRect.top - canvasRect.top) / currentZoom, width: startBoxRect.width / currentZoom, height: startBoxRect.height / currentZoom };
            const offset = 120; let newBoxCoords = { x: 0, y: 0 };
            switch (e.key) {
                case 'ArrowRight': newBoxCoords = { x: startBoxCanvasPos.x + startBoxCanvasPos.width + offset, y: startBoxCanvasPos.y + startBoxCanvasPos.height / 2 - 20 }; break;
                case 'ArrowLeft': const newBoxWidth = 100; newBoxCoords = { x: startBoxCanvasPos.x - newBoxWidth - offset, y: startBoxCanvasPos.y + startBoxCanvasPos.height / 2 - 20 }; break;
                case 'ArrowDown': newBoxCoords = { x: startBoxCanvasPos.x + startBoxCanvasPos.width / 2 - 50, y: startBoxCanvasPos.y + startBoxCanvasPos.height + offset }; break;
                case 'ArrowUp': const newBoxHeight = 40; newBoxCoords = { x: startBoxCanvasPos.x + startBoxCanvasPos.width / 2 - 50, y: startBoxCanvasPos.y - newBoxHeight - offset }; break;
            }
            const startInfo = { type: 'box', startBoxId: startBoxId }; createConnectedBoxWithLabelPrompt(startInfo, newBoxCoords);
            return;
        }
        if (isLabelEditing || isTextBoxEditing) return;
        if (e.key === 'Alt' && selectedConnectorId) { e.preventDefault(); splitSelectedArrow(); return; }
        switch (e.key.toLowerCase()) {
            case 'z': if (e.ctrlKey) { e.preventDefault(); undo(); } break;
            case 'y': if (e.ctrlKey) { e.preventDefault(); redo(); } break;
            case 'delete': case 'backspace':
                if (activeTextBox) { e.preventDefault(); deleteActiveTextBox(); }
                if (selectedConnectorId) { e.preventDefault(); deleteConnector(selectedConnectorId); }
                if (selectedImageId) { e.preventDefault(); deleteSelectedImage(); }
                if (selectedStickerId) { e.preventDefault(); deleteSelectedSticker(); }
                break;
        }
    });

    document.addEventListener('selectionchange', () => { if (document.activeElement.closest('.textbox')) updateInlineToolboxState(); });

    menuToggleBtn.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); document.body.classList.toggle('sidebar-open'); });
    toolboxDragHandle.addEventListener('mousedown', (e) => { isToolboxDragging = true; toolboxOffsetX = e.clientX - floatingToolbox.offsetLeft; toolboxOffsetY = e.clientY - floatingToolbox.offsetTop; });
    addPageBtn.addEventListener('click', addNewPage);
    noteArea.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); const zoomFactor = e.deltaY < 0 ? 1.25 : 1 / 1.25; const rect = noteArea.getBoundingClientRect(); const pivotX = e.clientX - rect.left; const pivotY = e.clientY - rect.top; updateZoom(zoomFactor, pivotX, pivotY); } }, { passive: false });
    zoomInBtn.addEventListener('click', () => { const pivotX = noteArea.clientWidth / 2; const pivotY = noteArea.clientHeight / 2; updateZoom(1.25, pivotX, pivotY); });
    zoomOutBtn.addEventListener('click', () => { const pivotX = noteArea.clientWidth / 2; const pivotY = noteArea.clientHeight / 2; updateZoom(1 / 1.25, pivotX, pivotY); });
    fitToScreenBtn.addEventListener('click', () => { const page = appData.pages?.[appData.currentPageId]; if (!page || (!page.content?.length && !page.images?.length)) { currentZoom = 1.0; canvasContent.style.transform = `scale(${currentZoom})`; scrollToCenter(currentCanvasWidth/2, currentCanvasHeight/2); return; }; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; (page.content || []).forEach(box => { const el = document.getElementById(box.id); if (!el) return; minX = Math.min(minX, el.offsetLeft); minY = Math.min(minY, el.offsetTop); maxX = Math.max(maxX, el.offsetLeft + el.offsetWidth); maxY = Math.max(maxY, el.offsetTop + el.offsetHeight); }); (page.images || []).forEach(img => { minX = Math.min(minX, img.x); minY = Math.min(minY, img.y); maxX = Math.max(maxX, img.x + img.width); maxY = Math.max(maxY, img.y + img.height); }); const contentWidth = maxX - minX; const contentHeight = maxY - minY; const padding = 100; const zoomX = (noteArea.clientWidth - padding) / contentWidth; const zoomY = (noteArea.clientHeight - padding) / contentHeight; currentZoom = Math.min(zoomX, zoomY, 2.0); canvasContent.style.transition = 'transform 0.3s ease-out'; canvasContent.style.transform = `scale(${currentZoom})`; setTimeout(() => { const centerX = minX + contentWidth / 2; const centerY = minY + contentHeight / 2; scrollToCenter(centerX, centerY); setTimeout(() => { canvasContent.style.transition = ''; }, 300); }, 100); });
    toggleMemoBtn.addEventListener('click', toggleMemo);
    statsToggleBtn.addEventListener('click', () => { statsPanel.classList.toggle('hidden'); document.body.classList.toggle('stats-visible'); localStorage.setItem('myNoteAppV17_statsHidden', statsPanel.classList.contains('hidden')); });
    focusModeBtn.addEventListener('click', () => { if (!isFocusModeActive && !isFocusApplied) turnOffOtherModes('focus'); toggleFocusMode(); });

    document.addEventListener('click', (e) => { 
        if (e.target.closest('#sticker-tool-btn')) {} 
        else if (e.target.closest('#sticker-toolbox')) {}
        else if (!isStickerMode) stickerToolbox.classList.add('hidden');
        lineColorPalette.classList.add('hidden'); 
        inlineToolbox.querySelectorAll('.color-palette').forEach(p => p.classList.add('hidden')); 
        const drawPalette = document.getElementById('draw-color-palette');
        if (drawPalette) drawPalette.classList.add('hidden');
        hideLinkToolbox();
    });
        

    // =================================================================
    // 17. INITIALIZATION
    // =================================================================
    
    // =================================================================
// 17. INITIALIZATION & AUTHENTICATION
// =================================================================

// 新しいアプリの起動処理
function init() {
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("ログイン成功: ", user.uid);
            loadUserData(user.uid);
        } else {
            console.log("誰もログインしていません。匿名でログインします。");
            createNewAnonymousUser();
        }
    });
    setupInlineToolbox();
    setupLinkToolbox();
    setupLineColorToolbox();
    setupDrawingTools();
    setupImagePlacement();
    setupStickerTools();
    setupMultiArrowModal();
    if (window.innerWidth > 768) { sidebar.classList.remove('collapsed'); document.body.classList.add('sidebar-open'); } 
    else { sidebar.classList.add('collapsed'); document.body.classList.remove('sidebar-open'); }
}
async function loadUserData(uid) {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        console.error("ユーザーデータが見つかりません。アプリを初期化できません。");
        return; 
    }
    const userData = userDocSnap.data();
    if (userData.accessibleMaps && userData.accessibleMaps.length > 0) {
        currentMapId = userData.accessibleMaps[0];
        const mapDocRef = doc(db, 'mindmaps', currentMapId);
        const mapDocSnap = await getDoc(mapDocRef);
        if (mapDocSnap.exists()) {
            appData = mapDocSnap.data().content || {};
            console.log("データの読み込みが完了しました。画面を描画します。");
            render();
            // 初期表示時に中央へスクロール
            const page = appData.pages?.[appData.currentPageId];
            if (page && page.content && page.content.length > 0) {
                const firstElement = page.content[0];
                setTimeout(() => scrollToCenter(firstElement.x, firstElement.y), 100);
            }
        } else {
            console.error("マップデータが見つかりません。");
        }
    }
}
async function createNewAnonymousUser() {
    try {
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;
        const initialPageId = `page-${Date.now()}`;
        const centerX = currentCanvasWidth / 2;
        const centerY = currentCanvasHeight / 2;
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        const initialContent = {
            pages: {
                [initialPageId]: {
                    title: '最初のページ',
                    content: [ { id: `box-quote-${Date.now()}`, x: centerX, y: centerY, html: `<i>${randomQuote}</i>`, isBordered: false, borderColor: '#333333', backgroundColor: '', createdAt: Date.now() } ],
                    connectors: [], shapes: [], images: [], stickers: [], memo: null
                }
            },
            currentPageId: initialPageId
        };
        const newMapRef = await addDoc(collection(db, 'mindmaps'), {
            title: "最初のマインドマップ",
            members: { [uid]: "owner" },
            content: initialContent
        });
        currentMapId = newMapRef.id;
        await setDoc(doc(db, 'users', uid), {
            plan: "anonymous",
            createdAt: serverTimestamp(),
            accessibleMaps: [currentMapId]
        });
        appData = initialContent;
        render();
        setTimeout(() => {
            scrollToCenter(centerX, centerY);
        }, 50);
    } catch (error) {
        console.error("匿名ユーザーの作成プロセス全体でエラーが発生しました:", error);
    }
}
// --- 変更後: createNewAnonymousUser 終了 ---

// UTILITY: Viewport positioning
function updateZoom(zoomFactor, pivotX, pivotY) { const newZoom = Math.max(0.2, Math.min(3.0, currentZoom * zoomFactor)); const worldX = (noteArea.scrollLeft + pivotX) / currentZoom; const worldY = (noteArea.scrollTop + pivotY) / currentZoom; currentZoom = newZoom; canvasContent.style.transform = `scale(${currentZoom})`; const newScrollLeft = worldX * currentZoom - pivotX; const newScrollTop = worldY * currentZoom - pivotY; noteArea.scrollLeft = newScrollLeft; noteArea.scrollTop = newScrollTop; }
function scrollToCenter(x, y) { const scrollLeft = x * currentZoom - noteArea.clientWidth / 2; const scrollTop = y * currentZoom - noteArea.clientHeight / 2; noteArea.scrollLeft = scrollLeft > 0 ? scrollLeft : 0; noteArea.scrollTop = scrollTop > 0 ? scrollTop : 0; }

// =================================================================
// ★ アプリの起動
// =================================================================
init();