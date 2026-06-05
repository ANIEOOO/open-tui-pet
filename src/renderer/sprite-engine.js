import { STATES } from './state-machine.js'

export const COLS = 8
export const ROWS = 9

export function pos(c, r) {
  return `${c / (COLS - 1) * 100}% ${r / (ROWS - 1) * 100}%`
}

export function buildFrames(s) {
  if (s.frames) {
    const slow = s.slow || 1
    return s.frames.map(f => ({ c: f.c, r: s.row, d: f.d * slow }))
  }
  return Array.from({ length: s.count }, (_, i) => ({
    c: i, r: s.row, d: i === s.count - 1 ? s.last : s.dur
  }))
}

export function createPlayer(petSpriteEl) {
  let currentState = null
  let stateTimer = null
  let loaded = false

  function play(stateName) {
    if (!loaded) return
    if (stateName === currentState && stateTimer) return

    currentState = stateName
    if (stateTimer) {
      clearTimeout(stateTimer)
      stateTimer = null
    }

    const def = STATES[stateName] || STATES.idle
    const frames = buildFrames(def)
    let i = 0

    petSpriteEl.style.backgroundPosition = pos(frames[0].c, frames[0].r)
    if (frames.length === 1) return

    const tick = () => {
      stateTimer = setTimeout(() => {
        i = (i + 1) % frames.length
        petSpriteEl.style.backgroundPosition = pos(frames[i].c, frames[i].r)
        tick()
      }, frames[i].d)
    }
    tick()
  }

  function stop() {
    if (stateTimer) {
      clearTimeout(stateTimer)
      stateTimer = null
    }
    currentState = null
  }

  function setLoaded(val) { loaded = val }

  return { play, stop, setLoaded }
}
