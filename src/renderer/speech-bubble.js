import { REACTION_MESSAGES } from './state-machine.js'

export function createSpeechBubble() {
  const speechBubble = document.getElementById('speech-bubble')
  const bubbleText = document.getElementById('bubble-text')
  let bubbleTimeout = null

  function show(reaction) {
    if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null }
    const messages = REACTION_MESSAGES[reaction] || REACTION_MESSAGES.idle
    const message = messages[Math.floor(Math.random() * messages.length)]
    bubbleText.textContent = message
    speechBubble.classList.add('visible')
    const duration = Math.max(2000, message.length * 100)
    bubbleTimeout = setTimeout(hide, duration)
  }

  function showText(text, duration) {
    if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null }
    bubbleText.textContent = text
    speechBubble.classList.add('visible')
    const ms = duration ?? Math.max(2000, text.length * 100)
    bubbleTimeout = setTimeout(hide, ms)
  }

  function hide() {
    speechBubble.classList.remove('visible')
    if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null }
  }

  return { show, showText, hide }
}
