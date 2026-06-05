import { createPlayer } from './sprite-engine.js'
import { createStateMachine } from './state-machine.js'
import { createSpeechBubble } from './speech-bubble.js'
import { createEventHandler, createSleepChecker } from './event-handler.js'
import { createPermissionPopup } from './permission-popup.js'

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
