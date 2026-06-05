const BUBBLE_THROTTLE_MS = 3000

export function createEventHandler(stateMachine, speechBubble) {
  let lastEventTime = Date.now()
  let happyTimeout = null
  let worriedTimeout = null
  let lastBubbleChange = 0

  function setState(newState) {
    if (happyTimeout) { clearTimeout(happyTimeout); happyTimeout = null }
    if (worriedTimeout) { clearTimeout(worriedTimeout); worriedTimeout = null }
    lastEventTime = Date.now()
    stateMachine.setState(newState)
  }

  function showBubble(reaction, force) {
    const now = Date.now()
    if (!force && now - lastBubbleChange < BUBBLE_THROTTLE_MS) return
    lastBubbleChange = now
    speechBubble.show(reaction)
  }

  function showText(text, duration, force) {
    const now = Date.now()
    if (!force && now - lastBubbleChange < BUBBLE_THROTTLE_MS) return
    lastBubbleChange = now
    speechBubble.showText(text, duration)
  }

  function transitionToSuccess() {
    setState('success')
    showBubble('waving', true)
    happyTimeout = setTimeout(() => {
      setState('idle')
      speechBubble.hide()
      lastBubbleChange = 0
    }, 3000)
  }

  function transitionToError() {
    setState('error')
    showBubble('failed', true)
    worriedTimeout = setTimeout(() => {
      setState(stateMachine.getPreviousState())
      speechBubble.hide()
      lastBubbleChange = 0
    }, 5000)
  }

  function categorizeTool(toolName) {
    if (!toolName) return 'tool_edit'
    const name = toolName.toLowerCase()
    if (['edit', 'write', 'patch'].includes(name)) return 'tool_edit'
    if (['grep', 'glob', 'search'].includes(name)) return 'tool_search'
    if (['read'].includes(name)) return 'tool_read'
    if (['task', 'task_status'].includes(name)) return 'tool_delegate'
    if (['fetch', 'websearch'].includes(name)) return 'tool_browse'
    if (['shell', 'bash'].includes(name)) return 'tool_terminal'
    if (['todo', 'skill'].includes(name)) return 'tool_plan'
    return 'tool_edit'
  }

  function handleToolCalled(toolName) {
    const category = categorizeTool(toolName)
    setState('working')
    showBubble(category, false)
  }

  function handlePermissionAsked() {
    setState('waiting')
    showBubble('permission', true)
  }

  function handlePermissionReplied() {
    setState('working')
    speechBubble.hide()
    lastBubbleChange = 0
  }

  function handleQuestionAsked() {
    setState('waiting')
    showBubble('question', true)
  }

  function handleQuestionReplied() {
    setState('working')
    speechBubble.hide()
    lastBubbleChange = 0
  }

  function handleTodoUpdated(todos) {
    if (!Array.isArray(todos)) return
    const total = todos.length
    const completed = todos.filter(t => t.status === 'completed').length
    setState('working')
    showText(`Tasks: ${completed}/${total} done`, 3000, false)
  }

  function handleEvent(event) {
    if (stateMachine.getCurrentState() === 'sleeping') setState('idle')

    switch (event.type) {
      case 'session.status': {
        const status = event.properties?.status
        if (status?.type === 'busy') {
          setState('working')
          showBubble('running', false)
        } else if (status?.type === 'idle') {
          transitionToSuccess()
        } else if (status?.type === 'retry') {
          transitionToError()
        }
        break
      }
      case 'session.error':
        transitionToError()
        break
      case 'session.compaction':
      case 'session.thinking':
        setState('thinking')
        showBubble('review', false)
        break
      case 'session.editing':
        setState('editing')
        showBubble('running', false)
        break
      case 'session.testing':
        setState('testing')
        showBubble('review', false)
        break
      case 'session.waiting':
        setState('waiting')
        showBubble('waiting', false)
        break
      case 'session.next.tool.called': {
        const toolName = event.properties?.tool
        handleToolCalled(toolName)
        break
      }
      case 'message.part.updated': {
        const part = event.properties?.part
        if (part?.type === 'tool' && part.state?.status === 'running') {
          handleToolCalled(part.tool)
        }
        break
      }
      case 'permission.asked':
        handlePermissionAsked()
        break
      case 'permission.replied':
        handlePermissionReplied()
        break
      case 'question.asked':
        handleQuestionAsked()
        break
      case 'question.replied':
      case 'question.rejected':
        handleQuestionReplied()
        break
      case 'todo.updated': {
        const todos = event.properties?.todos
        handleTodoUpdated(todos)
        break
      }
      case 'server.heartbeat':
        lastEventTime = Date.now()
        break
      case 'server.connected':
        setState('idle')
        showBubble('idle', true)
        break
    }
  }

  return { handleEvent, getLastEventTime: () => lastEventTime }
}

export function createSleepChecker(stateMachine, speechBubble, eventHandler) {
  let interval = null

  function check() {
    const elapsed = Date.now() - eventHandler.getLastEventTime()
    if (elapsed >= 5 * 60 * 1000 && stateMachine.getCurrentState() !== 'idle') {
      stateMachine.setState('sleeping')
      speechBubble.hide()
    }
  }

  function start() { interval = setInterval(check, 30000) }
  function stop() { if (interval) { clearInterval(interval); interval = null } }

  return { start, stop }
}
