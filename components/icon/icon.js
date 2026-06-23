const BUILTIN_TYPES = ['success', 'success_no_circle', 'info', 'warn', 'waiting', 'cancel', 'download', 'clear']

// SVG path definitions for each icon type (24x24 viewBox, 2px stroke)
const SVG_PATHS = {
  'search': '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
  'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'close': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'arrow-right': '<polyline points="9 18 15 12 9 6"/>',
  'arrow-down': '<polyline points="6 9 12 15 18 9"/>',
  'dot': '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  'circle': '<circle cx="12" cy="12" r="8"/>',
  'location': '<path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2C20 17.5 12 22 12 22z"/><circle cx="12" cy="10" r="3"/>',
  'scan': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>',
  'box': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  'chart': '<line x1="4" y1="20" x2="4" y2="14"/><line x1="9" y1="20" x2="9" y2="8"/><line x1="14" y1="20" x2="14" y2="11"/><line x1="19" y1="20" x2="19" y2="5"/>',
  'home': '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m4 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2"/>',
  'document': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'stock': '<path d="M4 7V4h16v3"/><path d="M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'setting': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>',
  'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="0.5"/><circle cx="4" cy="12" r="0.5"/><circle cx="4" cy="18" r="0.5"/>',
  'package': '<path d="M16.5 9.4L7.5 4.5m9 10.2l-9-5.1M12 21V12M3.5 8l4.1-2.3M3.5 8v7.5c0 .8.4 1.5 1 1.9l6.5 4c.6.4 1.5.4 2 0l6.5-4c.6-.4 1-1.1 1-1.9V8m-17 0l6.5-4c.6-.4 1.5-.4 2 0l6.5 4"/>',
  'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="4" y1="4" x2="20" y2="20"/>',
  'check': '<polyline points="4 12 9 17 20 6"/>',
}

function svgDataUri(svgPath, color, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${escapeAttr(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${svgPath}</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function escapeAttr(str) {
  return str.replace(/"/g, "'")
}

Component({
  properties: {
    type: { type: String, value: 'info' },
    size: { type: Number, value: 20 },
    color: { type: String, value: '#999999' }
  },

  data: {
    isBuiltin: false,
    iconSrc: ''
  },

  observers: {
    'type, size, color': function (type, size, color) {
      if (BUILTIN_TYPES.indexOf(type) !== -1) {
        this.setData({ isBuiltin: true, iconSrc: '' })
      } else {
        const path = SVG_PATHS[type] || SVG_PATHS['search']
        this.setData({
          isBuiltin: false,
          iconSrc: svgDataUri(path, color, size)
        })
      }
    }
  },

  attached() {
    const type = this.data.type
    const size = this.data.size
    const color = this.data.color
    if (BUILTIN_TYPES.indexOf(type) !== -1) {
      this.setData({ isBuiltin: true })
    } else {
      const path = SVG_PATHS[type] || SVG_PATHS['search']
      this.setData({
        isBuiltin: false,
        iconSrc: svgDataUri(path, color, size)
      })
    }
  }
})
