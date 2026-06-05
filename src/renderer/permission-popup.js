const TOOL_META = {
  edit:      { icon: '✏️', label: 'Edit File' },
  write:     { icon: '📝', label: 'Write File' },
  patch:     { icon: '🩹', label: 'Patch File' },
  read:      { icon: '📖', label: 'Read File' },
  grep:      { icon: '🔍', label: 'Search Content' },
  glob:      { icon: '📂', label: 'Search Files' },
  search:    { icon: '🔍', label: 'Search' },
  bash:      { icon: '⚡', label: 'Run Command' },
  shell:     { icon: '⚡', label: 'Run Command' },
  fetch:     { icon: '🌐', label: 'Fetch URL' },
  websearch: { icon: '🌐', label: 'Web Search' },
  task:      { icon: '📋', label: 'Delegate Task' },
  todo:      { icon: '✅', label: 'Update Tasks' },
  skill:     { icon: '🧩', label: 'Load Skill' },
}

const DEFAULT_META = { icon: '🔐', label: 'Permission Required' }

function getToolMeta(toolName) {
  if (!toolName) return DEFAULT_META
  return TOOL_META[toolName.toLowerCase()] || { icon: '🔐', label: `Allow ${toolName}` }
}

export function createPermissionPopup() {
  const popup = document.getElementById('permission-popup')
  const popupTitle = document.getElementById('permission-title')
  const popupSubtitle = document.getElementById('permission-subtitle')
  const popupDetail = document.getElementById('permission-detail')
  const btnAllow = document.getElementById('permission-allow')
  const btnAllowAlways = document.getElementById('permission-allow-always')
  const btnDeny = document.getElementById('permission-deny')

  let currentRequest = null

  function show(request) {
    currentRequest = { id: request.id, sessionID: request.sessionID }
    const toolName = request.permission || ''
    const patterns = request.patterns?.join(', ') || ''
    const meta = getToolMeta(toolName)

    popupTitle.textContent = `${meta.icon} ${meta.label}`
    popupSubtitle.textContent = toolName || 'unknown'
    popupDetail.textContent = patterns || 'This action needs your approval'

    popup.classList.add('visible')

    btnAllow.onclick = () => {
      window.petApi.replyPermission({ requestID: currentRequest.id, sessionID: currentRequest.sessionID, reply: 'once' })
      hide()
    }

    btnAllowAlways.onclick = () => {
      window.petApi.replyPermission({ requestID: currentRequest.id, sessionID: currentRequest.sessionID, reply: 'always' })
      hide()
    }

    btnDeny.onclick = () => {
      window.petApi.replyPermission({ requestID: currentRequest.id, sessionID: currentRequest.sessionID, reply: 'reject' })
      hide()
    }
  }

  function hide() {
    popup.classList.remove('visible')
    currentRequest = null
  }

  return { show, hide }
}
