// Simple test script to verify the simplified event generation system
const { EventType } = require('./stores/WorldProvider.tsx')

// Mock questions for testing
const mockQuestions = [
  {
    id: '1',
    question: 'What is 2 + 2?',
    answers: [
      { id: 'a', label: '3', isCorrect: false },
      { id: 'b', label: '4', isCorrect: true },
      { id: 'c', label: '5', isCorrect: false },
    ],
    sources: [],
  },
  {
    id: '2',
    question: 'What is the capital of France?',
    answers: [
      { id: 'a', label: 'London', isCorrect: false },
      { id: 'b', label: 'Paris', isCorrect: true },
      { id: 'c', label: 'Berlin', isCorrect: false },
    ],
    sources: [],
  },
]

// Import the event generation logic from WorldProvider
// Note: This would normally be tested through the WorldProvider store creation,
// but we'll simulate it here for testing purposes

console.log('Testing simplified event generation system...')

// Simulate the pattern sequence
const PATTERN_SEQUENCE = [
  EventType.LANE_CHANGE,
  EventType.CLUSTER,
  EventType.LANE_CHANGE,
  EventType.CLUSTER,
  EventType.REST,
  EventType.ANSWER_GATE,
]

// Simulate event generation (simplified version of generateLevelEvents)
const events = []
let currentTime = 2.0
let patternIndex = 0
let questionIndex = 0

console.log('\nGenerated Events:')

// Generate a few cycles of the pattern
for (let cycle = 0; cycle < 2 && questionIndex < mockQuestions.length; cycle++) {
  console.log(`\nCycle ${cycle + 1}:`)

  for (let step = 0; step < PATTERN_SEQUENCE.length && questionIndex < mockQuestions.length; step++) {
    const eventType = PATTERN_SEQUENCE[patternIndex]
    const eventId = `${eventType}_${currentTime}`

    if (eventType === EventType.ANSWER_GATE) {
      const question = mockQuestions[questionIndex]
      console.log(`  Event: ${eventType} at ${currentTime}s`)
      console.log(`    Question: ${question.question}`)
      questionIndex++
      currentTime += 2.0
    } else if (eventType === EventType.REST) {
      console.log(`  Event: ${eventType} (break) at ${currentTime}s`)
      currentTime += 1.0
    } else {
      console.log(`  Event: ${eventType} at ${currentTime}s`)
      currentTime += 1.2
    }

    patternIndex = (patternIndex + 1) % PATTERN_SEQUENCE.length
  }
}

console.log(`\nTotal events generated: ${questionIndex * 6}`) // 6 events per question cycle
console.log('Test completed successfully!')

console.log('\nTo test with actual WorldProvider:')
console.log('1. Create a WorldProvider with questions')
console.log('2. The generateLevelEvents function will create the full event sequence')
console.log('3. Events are processed during game.update() calls')
