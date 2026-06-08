import { createPlayer } from './sprite-engine.js'
import { createStateMachine } from './state-machine.js'
import { createSpeechBubble } from './speech-bubble.js'
import { createEventHandler, createSleepChecker } from './event-handler.js'
import { createPermissionPopup } from './permission-popup.js'

const DOUBLE_CLICK_MS = 300
const LONG_PRESS_MS = 600
const MOVE_THRESHOLD_PX = 5
const CLICK_RETURN_MS = 3000
const IDLE_TIMEOUT_MS = 10000
const ROAMING_SPEED_PX = 50
const ROAMING_MIN_MS = 3000
const ROAMING_MAX_MS = 8000
const EDGE_PAUSE_MS = 1000

const CUTE_MESSAGES = ['Hi! 👋', '别戳我~', '摸摸头~', 'Hello!', '嘿嘿~']
const EXCITED_MESSAGES = ['Woo!', '太开心!', 'Yay!', '蹦蹦跳~', 'Yeah!']
const EASTER_EGG_MESSAGES = ['你发现了秘密!', '长按大师!', '✨ Secret! ✨', '隐藏彩蛋~', 'Wow!']

function randomMessage(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

function init() {
  const petSprite = document.getElementById('pet-sprite')
  const noPetMessage = document.getElementById('no-pet-message')

  const player = createPlayer(petSprite)
  const stateMachine = createStateMachine(player)
  const speechBubble = createSpeechBubble()
  const eventHandler = createEventHandler(stateMachine, speechBubble)
  const sleepChecker = createSleepChecker(stateMachine, speechBubble, eventHandler)
  const permissionPopup = createPermissionPopup()

  window.petApi.onEvent((event) => {
    eventHandler.handleEvent(event)
    if (event.type === 'permission.replied' || event.type === 'question.replied' || event.type === 'question.rejected') {
      console.log('[pet:debug] Hiding popup for event:', event.type)
      permissionPopup.hide()
    }
  })

  window.petApi.onPetData((data) => {
    player.setLoaded(true)
    petSprite.style.backgroundImage = `url('${data.spriteDataUrl}')`
    petSprite.style.display = 'block'
    noPetMessage.style.display = 'none'
    player.play('idle')
  })

  window.petApi.onPermissionRequest((request) => {
    permissionPopup.show(request)
  })

  setTimeout(() => {
    if (!petSprite.style.backgroundImage) {
      petSprite.style.display = 'none'
      noPetMessage.style.display = 'block'
    }
  }, 3000)

  sleepChecker.start()

  // ── Roaming Engine ──
  let idleTimer = null
  let roamingActive = false
  let roamingRAF = null
  let roamingDirection = 1
  let lastFrameTime = 0
  let edgePauseTimer = null
  let walkDurationTimer = null

  function startIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      if (stateMachine.getCurrentState() === 'idle') {
        startRoaming()
      }
    }, IDLE_TIMEOUT_MS)
  }

  function cleanupRoaming() {
    roamingActive = false
    if (roamingRAF) {
      cancelAnimationFrame(roamingRAF)
      roamingRAF = null
    }
    if (edgePauseTimer) {
      clearTimeout(edgePauseTimer)
      edgePauseTimer = null
    }
    if (walkDurationTimer) {
      clearTimeout(walkDurationTimer)
      walkDurationTimer = null
    }
  }

  function stopRoaming() {
    cleanupRoaming()
    petSprite.style.left = '0px'
    player.play('idle')
  }

  function startRoaming() {
    if (window.innerWidth < petSprite.offsetWidth * 2) return

    roamingActive = true
    roamingDirection = Math.random() < 0.5 ? -1 : 1

    const anim = roamingDirection === 1 ? 'running-right' : 'running-left'
    player.play(anim)

    lastFrameTime = performance.now()

    const walkDuration = ROAMING_MIN_MS + Math.random() * (ROAMING_MAX_MS - ROAMING_MIN_MS)
    walkDurationTimer = setTimeout(() => {
      stopRoaming()
      startIdleTimer()
    }, walkDuration)

    function moveLoop(currentTime) {
      if (!roamingActive) return

      const deltaTime = currentTime - lastFrameTime
      lastFrameTime = currentTime

      const currentLeft = parseFloat(petSprite.style.left) || 0
      const maxLeft = window.innerWidth - petSprite.offsetWidth
      let newLeft = currentLeft + (roamingDirection * ROAMING_SPEED_PX * deltaTime / 1000)

      if (newLeft <= 0 || newLeft >= maxLeft) {
        newLeft = Math.max(0, Math.min(newLeft, maxLeft))
        petSprite.style.left = newLeft + 'px'

        roamingActive = false
        cancelAnimationFrame(roamingRAF)
        roamingRAF = null

        edgePauseTimer = setTimeout(() => {
          roamingDirection *= -1
          const anim = roamingDirection === 1 ? 'running-right' : 'running-left'
          player.play(anim)
          roamingActive = true
          lastFrameTime = performance.now()
          roamingRAF = requestAnimationFrame(moveLoop)
        }, EDGE_PAUSE_MS)

        return
      }

      petSprite.style.left = newLeft + 'px'
      roamingRAF = requestAnimationFrame(moveLoop)
    }

    roamingRAF = requestAnimationFrame(moveLoop)
  }

  const originalSetState = stateMachine.setState
  stateMachine.setState = function(newState) {
    originalSetState.call(this, newState)
    if (stateMachine.getCurrentState() === 'idle') {
      startIdleTimer()
    } else {
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }
      cleanupRoaming()
    }
  }

  startIdleTimer()

  // ── Interruption Handling ──
  window.addEventListener('blur', () => {
    cleanupRoaming()
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  })

  window.addEventListener('resize', () => {
    cleanupRoaming()
    petSprite.style.left = '0px'
    startIdleTimer()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupRoaming()
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }
    } else if (stateMachine.getCurrentState() === 'idle') {
      startIdleTimer()
    }
  })

  let tapTimer = null
  let longPressTimer = null
  let longPressFired = false
  let mouseDownPos = null
  let isDragging = false
  let returnTimer = null

  function triggerTapAction(anim, messages) {
    const current = stateMachine.getCurrentState()
    if (current === 'waving' || current === 'failed') return
    cleanupRoaming()
    petSprite.style.left = '0px'
    player.play(anim)
    speechBubble.showText(randomMessage(messages))
    if (returnTimer) clearTimeout(returnTimer)
    returnTimer = setTimeout(() => {
      player.play(stateMachine.getPreviousState())
      returnTimer = null
    }, CLICK_RETURN_MS)
  }

  // Container-level drag (for dragging the window from non-interactive areas)
  const petContainer = document.getElementById('pet-container')
  petContainer.addEventListener('mousedown', (e) => {
    // Skip if click is on interactive elements
    if (e.target.closest('.pet-sprite, .permission-popup, .no-pet-message')) return

    const startX = e.screenX
    const startY = e.screenY
    const startWinX = window.screenX
    const startWinY = window.screenY

    const onMove = (e) => {
      window.petApi.dragWindow(startWinX + (e.screenX - startX), startWinY + (e.screenY - startY))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // Sprite-level interaction: tap (single/double/long-press) AND drag
  petSprite.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return
    longPressFired = false
    isDragging = false
    mouseDownPos = { x: e.clientX, y: e.clientY }
    const startScreenX = e.screenX
    const startScreenY = e.screenY
    const startWinX = window.screenX
    const startWinY = window.screenY

    longPressTimer = setTimeout(() => {
      longPressTimer = null
      longPressFired = true
      triggerTapAction('jumping', EASTER_EGG_MESSAGES)
    }, LONG_PRESS_MS)

    const onMouseMove = (e) => {
      if (!mouseDownPos) return
      const dx = e.clientX - mouseDownPos.x
      const dy = e.clientY - mouseDownPos.y
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        if (!isDragging) {
          isDragging = true
        }
        window.petApi.dragWindow(startWinX + (e.screenX - startScreenX), startWinY + (e.screenY - startScreenY))
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      if (!mouseDownPos) return
      mouseDownPos = null
      if (isDragging) return
      if (longPressFired) { longPressFired = false; return }
      if (tapTimer) {
        clearTimeout(tapTimer)
        tapTimer = null
        triggerTapAction('jumping', EXCITED_MESSAGES)
      } else {
        tapTimer = setTimeout(() => {
          tapTimer = null
          triggerTapAction('waving', CUTE_MESSAGES)
        }, DOUBLE_CLICK_MS)
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
