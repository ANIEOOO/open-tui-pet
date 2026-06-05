export const STATES = {
  idle:           { row: 0, frames: [{c:0,d:280},{c:1,d:110},{c:2,d:110},{c:3,d:140},{c:4,d:140},{c:5,d:320}], slow: 6 },
  'running-right':{ row: 1, count: 8, dur: 120, last: 220 },
  'running-left': { row: 2, count: 8, dur: 120, last: 220 },
  waving:         { row: 3, count: 4, dur: 140, last: 280 },
  jumping:        { row: 4, count: 5, dur: 140, last: 280 },
  failed:         { row: 5, count: 8, dur: 140, last: 240 },
  waiting:        { row: 6, count: 6, dur: 150, last: 260 },
  running:        { row: 7, count: 6, dur: 120, last: 220 },
  review:         { row: 8, count: 6, dur: 150, last: 280 },
}

export const STATE_MAP = {
  idle: 'idle',
  thinking: 'review',
  working: 'running',
  editing: 'running',
  testing: 'review',
  waiting: 'waiting',
  success: 'waving',
  error: 'failed',
  sleeping: 'idle',
}

export const REACTION_MESSAGES = {
  idle: ["Ready", "Standing by", "All quiet"],
  review: ["Reviewing...", "Planning...", "Considering..."],
  running: ["Working on it", "Making progress", "Processing"],
  waving: ["Done!", "All set!", "Complete!"],
  jumping: ["Yay!", "Success!", "Good to go!"],
  failed: ["Needs attention", "Something broke", "Check failed"],
  waiting: ["Approval needed", "Waiting for input", "Paused"],
  tool_edit: ["Editing file...", "Writing code...", "Modifying..."],
  tool_search: ["Searching...", "Looking for it...", "Scanning..."],
  tool_read: ["Reading...", "Checking file...", "Loading..."],
  tool_delegate: ["Delegating...", "Spawning agent...", "Assigning task..."],
  tool_browse: ["Browsing web...", "Fetching...", "Searching online..."],
  tool_terminal: ["Running command...", "Executing...", "In terminal..."],
  tool_plan: ["Planning...", "Organizing...", "Structuring..."],
  permission: ["Permission needed!", "Waiting for approval...", "Please confirm!"],
  question: ["Question for you!", "Need your input!", "Please answer!"],
  todo: ["Tasks updated", "Progress tracked", "Working on todos"],
}

export function createStateMachine(player) {
  let currentState = 'idle'
  let previousState = 'idle'

  function setState(newState) {
    if (newState !== 'error') previousState = currentState
    const spriteState = STATE_MAP[newState] || 'idle'
    currentState = spriteState
    player.play(spriteState)
  }

  function getCurrentState() { return currentState }
  function getPreviousState() { return previousState }

  return { setState, getCurrentState, getPreviousState }
}
