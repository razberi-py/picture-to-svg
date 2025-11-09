// Basic SVG Editor logic
(function () {
  const editor = document.getElementById('editor');
  const layer = document.getElementById('drawingLayer');
  const rasterCanvas = document.getElementById('rasterCanvas');
  const ctx = rasterCanvas.getContext('2d');

  const modeButtons = {
    select: document.getElementById('modeSelect'),
    rect: document.getElementById('modeRect'),
    circle: document.getElementById('modeCircle'),
    path: document.getElementById('modePath'),
  };
  const fillInput = document.getElementById('fillColor');
  const strokeInput = document.getElementById('strokeColor');
  const strokeWidthInput = document.getElementById('strokeWidth');
  const exportBtn = document.getElementById('openExport');
  const bringToFrontBtn = document.getElementById('bringToFront');
  const sendToBackBtn = document.getElementById('sendToBack');
  const deleteSelectedBtn = document.getElementById('deleteSelected');

  const propType = document.getElementById('propType');
  const propX = document.getElementById('propX');
  const propY = document.getElementById('propY');
  const propW = document.getElementById('propW');
  const propH = document.getElementById('propH');
  const propR = document.getElementById('propR');
  const propD = document.getElementById('propD');

  const rasterInput = document.getElementById('rasterInput');
  const vectorPreset = document.getElementById('vectorPreset');
  const vectorizeBtn = document.getElementById('vectorizeBtn');
  const sharpnessInput = document.getElementById('sharpnessScale');
  const sharpnessValue = document.getElementById('sharpnessValue');
  const vectorStatus = document.getElementById('vectorStatus');
  const rasterPreviewImg = document.getElementById('rasterPreview');
  const rasterMeta = document.getElementById('rasterMeta');

  let mode = 'select';
  let isDrawing = false;
  let startPoint = null;
  let currentElement = null;
  let selectedElement = null;
  let dragStart = null;

  const getStyles = () => ({
    fill: fillInput.value,
    stroke: strokeInput.value,
    strokeWidth: Number(strokeWidthInput.value) || 0,
  });

  function setMode(next) {
    mode = next;
    Object.values(modeButtons).forEach((b) => b.classList.remove('active'));
    modeButtons[next]?.classList.add('active');
  }

  // Initialize default mode
  setMode('select');

  // Mode button handlers
  Object.entries(modeButtons).forEach(([name, btn]) => {
    btn.addEventListener('click', () => setMode(name));
  });

  // Element creation helpers
  function createRect(x, y) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('width', 1);
    el.setAttribute('height', 1);
    applyStyles(el);
    layer.appendChild(el);
    return el;
  }

  function createCircle(cx, cy) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('cx', cx);
    el.setAttribute('cy', cy);
    el.setAttribute('r', 1);
    applyStyles(el);
    layer.appendChild(el);
    return el;
  }

  function createPath(x, y) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', `M ${x} ${y}`);
    el.setAttribute('fill', 'none'); // default path fill none unless changed
    applyStyles(el);
    layer.appendChild(el);
    return el;
  }

  function applyStyles(el) {
    const { fill, stroke, strokeWidth } = getStyles();
    if (el.tagName !== 'path') el.setAttribute('fill', fill);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
  }

  // Selection handling
  function setSelected(el) {
    selectedElement = el;
    drawSelectionOutline(el);
    updatePropertiesPanel(el);
  }

  function clearSelected() {
    selectedElement = null;
    removeSelectionOutline();
    updatePropertiesPanel(null);
  }

  let selectionOutline = null;
  function drawSelectionOutline(el) {
    removeSelectionOutline();
    if (!el) return;
    const bbox = el.getBBox();
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('x', bbox.x);
    outline.setAttribute('y', bbox.y);
    outline.setAttribute('width', bbox.width);
    outline.setAttribute('height', bbox.height);
    outline.classList.add('selection-outline');
    editor.appendChild(outline);
    selectionOutline = outline;
  }

  function removeSelectionOutline() {
    if (selectionOutline) {
      selectionOutline.remove();
      selectionOutline = null;
    }
  }

  // Properties panel
  function updatePropertiesPanel(el) {
    if (!el) {
      propType.textContent = 'None';
      [propX, propY, propW, propH, propR, propD].forEach((i) => (i.value = ''));
      return;
    }
    propType.textContent = el.tagName;
    const bbox = el.getBBox();
    propX.value = Math.round(bbox.x);
    propY.value = Math.round(bbox.y);
    propW.value = Math.round(bbox.width);
    propH.value = Math.round(bbox.height);
    propR.value = el.tagName === 'circle' ? Number(el.getAttribute('r')) : '';
    propD.value = el.tagName === 'path' ? el.getAttribute('d') : '';
  }

  // Update selected element from properties
  [propX, propY, propW, propH, propR, propD].forEach((input) => {
    input.addEventListener('input', () => {
      if (!selectedElement) return;
      const tag = selectedElement.tagName;
      const x = Number(propX.value);
      const y = Number(propY.value);
      const w = Number(propW.value);
      const h = Number(propH.value);
      const r = Number(propR.value);
      if (tag === 'rect') {
        if (!Number.isNaN(x)) selectedElement.setAttribute('x', x);
        if (!Number.isNaN(y)) selectedElement.setAttribute('y', y);
        if (!Number.isNaN(w)) selectedElement.setAttribute('width', Math.max(0, w));
        if (!Number.isNaN(h)) selectedElement.setAttribute('height', Math.max(0, h));
      } else if (tag === 'circle') {
        if (!Number.isNaN(x)) selectedElement.setAttribute('cx', x + (w || 0) / 2);
        if (!Number.isNaN(y)) selectedElement.setAttribute('cy', y + (h || 0) / 2);
        if (!Number.isNaN(r)) selectedElement.setAttribute('r', Math.max(0, r));
      } else if (tag === 'path') {
        if (propD.value) selectedElement.setAttribute('d', propD.value);
      }
      drawSelectionOutline(selectedElement);
    });
  });

  // Color/style changes apply to selected element if present
  [fillInput, strokeInput, strokeWidthInput].forEach((i) =>
    i.addEventListener('input', () => {
      if (selectedElement) applyStyles(selectedElement);
    })
  );

  // Z-order controls
  bringToFrontBtn.addEventListener('click', () => {
    if (selectedElement) layer.appendChild(selectedElement);
  });
  sendToBackBtn.addEventListener('click', () => {
    if (selectedElement) layer.insertBefore(selectedElement, layer.firstChild);
  });
  deleteSelectedBtn.addEventListener('click', () => {
    if (selectedElement) {
      selectedElement.remove();
      clearSelected();
    }
  });

  // Pointer event helpers
  function getPoint(evt) {
    const pt = editor.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = editor.getScreenCTM().inverse();
    const sp = pt.matrixTransform(ctm);
    return { x: sp.x, y: sp.y };
  }

  editor.addEventListener('mousedown', (evt) => {
    const point = getPoint(evt);
    isDrawing = true;
    startPoint = point;
    dragStart = point;

    if (mode === 'rect') {
      currentElement = createRect(point.x, point.y);
      setSelected(currentElement);
    } else if (mode === 'circle') {
      currentElement = createCircle(point.x, point.y);
      setSelected(currentElement);
    } else if (mode === 'path') {
      currentElement = createPath(point.x, point.y);
      setSelected(currentElement);
    } else if (mode === 'select') {
      const target = evt.target;
      if (target && target.parentNode === layer) {
        setSelected(target);
      } else {
        clearSelected();
      }
    }
  });

  editor.addEventListener('mousemove', (evt) => {
    if (!isDrawing) return;
    const point = getPoint(evt);
    if (mode === 'rect' && currentElement) {
      const x = Math.min(startPoint.x, point.x);
      const y = Math.min(startPoint.y, point.y);
      const w = Math.abs(point.x - startPoint.x);
      const h = Math.abs(point.y - startPoint.y);
      currentElement.setAttribute('x', x);
      currentElement.setAttribute('y', y);
      currentElement.setAttribute('width', w);
      currentElement.setAttribute('height', h);
      drawSelectionOutline(currentElement);
    } else if (mode === 'circle' && currentElement) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      currentElement.setAttribute('cx', startPoint.x);
      currentElement.setAttribute('cy', startPoint.y);
      currentElement.setAttribute('r', r);
      drawSelectionOutline(currentElement);
    } else if (mode === 'path' && currentElement) {
      const d = currentElement.getAttribute('d');
      currentElement.setAttribute('d', `${d} L ${point.x} ${point.y}`);
      drawSelectionOutline(currentElement);
    } else if (mode === 'select' && selectedElement) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      dragStart = point;
      const tag = selectedElement.tagName;
      if (tag === 'rect') {
        const x = Number(selectedElement.getAttribute('x')) + dx;
        const y = Number(selectedElement.getAttribute('y')) + dy;
        selectedElement.setAttribute('x', x);
        selectedElement.setAttribute('y', y);
      } else if (tag === 'circle') {
        const cx = Number(selectedElement.getAttribute('cx')) + dx;
        const cy = Number(selectedElement.getAttribute('cy')) + dy;
        selectedElement.setAttribute('cx', cx);
        selectedElement.setAttribute('cy', cy);
      } else {
        // For path and others, use translate transform
        const tf = selectedElement.getAttribute('transform') || '';
        const m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(tf);
        let tx = 0, ty = 0;
        if (m) { tx = Number(m[1]); ty = Number(m[2]); }
        selectedElement.setAttribute('transform', `translate(${tx + dx}, ${ty + dy})`);
      }
      drawSelectionOutline(selectedElement);
      updatePropertiesPanel(selectedElement);
    }
  });

  window.addEventListener('mouseup', () => {
    isDrawing = false;
    currentElement = null;
  });

  // Export modal open/close
  exportBtn.addEventListener('click', () => {
    exportModal.classList.remove('hidden');
    exportModal.setAttribute('aria-hidden', 'false');
  });

  document.getElementById('exportCancel')?.addEventListener('click', () => {
    exportModal.classList.add('hidden');
    exportModal.setAttribute('aria-hidden', 'true');
  });

  function getLayerBBox() {
    const children = Array.from(layer.children);
    if (children.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of children) {
      const bb = el.getBBox();
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }
    return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
  }

  function buildSVGString(sizeMode, paddingValue) {
    const pad = Math.max(0, Number(paddingValue) || 0);
    const edW = Number(editor.getAttribute('width'));
    const edH = Number(editor.getAttribute('height'));
    const bbox = getLayerBBox();
    let width = edW, height = edH, translateX = 0, translateY = 0;
    if (sizeMode === 'fit' && bbox) {
      width = Math.ceil(bbox.width + pad * 2);
      height = Math.ceil(bbox.height + pad * 2);
      translateX = pad - bbox.x;
      translateY = pad - bbox.y;
    }
    const content = layer.innerHTML;
    const transformed = (translateX || translateY)
      ? `<g transform="translate(${translateX}, ${translateY})">${content}</g>`
      : content;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      transformed +
      `</svg>`;
    return svg;
  }

  function download(format, filename, svgString) {
    const base = filename && filename.trim() ? filename.trim() : `drawing_${Date.now()}`;
    let blob, ext;
    if (format === 'svg') {
      blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      ext = 'svg';
    } else if (format === 'html') {
      const html = `<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>${base}</title></head><body>${svgString}</body></html>`;
      blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      ext = 'html';
    } else { // txt
      blob = new Blob([svgString], { type: 'text/plain;charset=utf-8' });
      ext = 'txt';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('exportConfirm')?.addEventListener('click', () => {
    const format = exportFormat.value || 'svg';
    const sizeMode = exportSize.value || 'canvas';
    const padding = exportPadding.value || 0;
    const fname = exportFilename.value || '';
    const svg = buildSVGString(sizeMode, padding);
    download(format, fname, svg);
    exportModal.classList.add('hidden');
    exportModal.setAttribute('aria-hidden', 'true');
  });

  // Raster to SVG vectorization
  let rasterImage = null;
  // Sharpness display
  if (sharpnessInput && sharpnessValue) {
    sharpnessValue.textContent = sharpnessInput.value;
    sharpnessInput.addEventListener('input', () => {
      sharpnessValue.textContent = sharpnessInput.value;
    });
  }
  rasterInput.addEventListener('change', async () => {
    const file = rasterInput.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Fit to canvas
      rasterCanvas.width = img.width;
      rasterCanvas.height = img.height;
      ctx.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);
      ctx.drawImage(img, 0, 0);
      rasterImage = img;
      URL.revokeObjectURL(url);
      if (rasterPreviewImg) {
        rasterPreviewImg.src = img.src;
      }
      if (rasterMeta) {
        rasterMeta.textContent = `${img.width} × ${img.height}`;
      }
      if (vectorStatus) {
        vectorStatus.textContent = 'Image loaded. Choose preset/sharpness and click Vectorize.';
      }
      vectorizeBtn.disabled = false;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (vectorStatus) vectorStatus.textContent = 'Failed to load image.';
      vectorizeBtn.disabled = true;
    };
    img.src = url;
  });

  function mapSharpnessToOptions(s, preset) {
    // s: 1..100 ; t: 0..1 (ease-in cubic for more aggressive high-end fidelity)
    const tlin = Math.max(0, Math.min(1, (Number(s) - 1) / 99));
    const t = Math.pow(tlin, 3);
    const lerp = (a, b, u) => a + (b - a) * u;
    const round = (x) => Math.max(0, Math.round(x));

    let options = {
      // Tighten geometric error thresholds dramatically near 100
      ltres: Number(lerp(10, 0.005, t).toFixed(3)),
      qtres: Number(lerp(10, 0.005, t).toFixed(3)),
      // Keep small paths at higher sharpness
      pathomit: round(lerp(80, 0, t)),
      // Increase color count for better detail; cap high for performance
      numberofcolors: round(lerp(8, 64, tlin)),
      // Remove blur as sharpness rises
      blurradius: round(lerp(5, 0, tlin)),
      blurdelta: round(lerp(96, 20, tlin)),
      // SVG rendering / behavior
      rightangleenhance: true,
      linefilter: tlin < 0.4, // more filtering when sharpness is low
      roundcoords: tlin >= 0.9 ? 3 : tlin >= 0.7 ? 2 : 1,
      strokewidth: tlin >= 0.9 ? 0 : 1,
      colorsampling: 2,
      colorquantcycles: tlin >= 0.9 ? 5 : 3,
      scale: 1,
      viewbox: false,
      desc: false,
    };

    // Ultra fidelity mode when slider is near 100
    if (tlin >= 0.95) {
      options.pathomit = 0;
      options.ltres = Math.min(options.ltres, 0.003);
      options.qtres = Math.min(options.qtres, 0.003);
      options.blurradius = 0;
      options.blurdelta = 20;
      options.numberofcolors = Math.max(options.numberofcolors, 64);
      options.linefilter = false;
      options.strokewidth = 0;
    }

    // Respect general preset style but keep sharpness intent
    switch ((preset || '').toLowerCase()) {
      case 'grayscale':
        options.colorsampling = 0;
        options.colorquantcycles = Math.min(options.colorquantcycles, 2);
        options.numberofcolors = Math.max(4, Math.min(16, options.numberofcolors));
        break;
      case 'posterized1':
        options.colorsampling = 0;
        options.numberofcolors = Math.max(2, Math.min(8, options.numberofcolors));
        break;
      case 'posterized2':
        options.numberofcolors = Math.max(4, Math.min(16, options.numberofcolors));
        options.blurradius = Math.min(options.blurradius, 5);
        break;
      case 'detailed':
        options.pathomit = Math.min(options.pathomit, 1);
        options.numberofcolors = Math.max(options.numberofcolors, 64);
        options.roundcoords = Math.max(options.roundcoords, 2);
        break;
      case 'sharp':
        options.qtres = Math.min(options.qtres, 0.01);
        options.ltres = Math.min(options.ltres, 0.05);
        options.linefilter = false;
        break;
      default:
        break;
    }
    return options;
  }

  // Disable vectorize until an image is loaded
  vectorizeBtn.disabled = true;

  vectorizeBtn.addEventListener('click', () => {
    if (!rasterImage) { alert('Please import a PNG/JPEG first.'); return; }
    try {
      if (typeof ImageTracer === 'undefined') {
        throw new Error('Vectorizer library not loaded.');
      }
      if (vectorStatus) vectorStatus.textContent = 'Vectorizing…';
      const imgd = ImageTracer.getImgdata(rasterCanvas);
      const preset = vectorPreset.value || 'posterized2';
      const sharpness = sharpnessInput ? Number(sharpnessInput.value) : 80;
      const opts = mapSharpnessToOptions(sharpness, preset);
      const svgstr = ImageTracer.imagedataToSVG(imgd, opts);
      // Parse the SVG string and append its child elements to the drawing layer
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgstr, 'image/svg+xml');
      const svgEl = doc.documentElement;
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // Scale down if the raster is bigger than editor
      const edW = Number(editor.getAttribute('width'));
      const edH = Number(editor.getAttribute('height'));
      const scaleX = edW / rasterCanvas.width;
      const scaleY = edH / rasterCanvas.height;
      const scale = Math.min(scaleX, scaleY);
      group.setAttribute('transform', `scale(${scale})`);
      // Move children from parsed svg into group
      [...svgEl.children].forEach((child) => {
        group.appendChild(editor.ownerDocument.importNode(child, true));
      });
      layer.appendChild(group);
      setSelected(group);
      if (vectorStatus) vectorStatus.textContent = 'Vectorization complete.';
    } catch (e) {
      console.error(e);
      if (vectorStatus) vectorStatus.textContent = `Vectorization failed: ${e?.message || e}`;
    }
  });
})();
  // Export modal elements
  const exportModal = document.getElementById('exportModal');
  const exportFormat = document.getElementById('exportFormat');
  const exportSize = document.getElementById('exportSize');
  const exportPadding = document.getElementById('exportPadding');
  const exportFilename = document.getElementById('exportFilename');
  const exportConfirm = document.getElementById('exportConfirm');
  const exportCancel = document.getElementById('exportCancel');