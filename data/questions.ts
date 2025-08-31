export type Answer = {
  id: string
  label: string // short, slot-friendly
  isCorrect: boolean
}

export type SourceLink = {
  title: string
  url: string // canonical source link
}

export type Question = {
  id: string
  question: string // the prompt
  reading: string // short paragraph shown before test phase
  sources: SourceLink[] // 1–3 links
  answers: Answer[] // length 2 or 4
}

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q-101',
    question: 'Who proposed the imitation game (Turing test) in 1950?',
    reading:
      'In 1950, Alan Turing proposed the “imitation game” in his paper "Computing Machinery and Intelligence." It later became known as the Turing test — a practical way to discuss whether a machine can exhibit human-like intelligence in dialogue.',
    sources: [
      {
        title: 'Stanford Encyclopedia of Philosophy – The Turing Test',
        url: 'https://plato.stanford.edu/entries/turing-test/',
      },
    ],
    answers: [
      { id: 'a-101-1', label: 'Alan Turing', isCorrect: true },
      { id: 'a-101-2', label: 'John McCarthy', isCorrect: false },
      { id: 'a-101-4', label: 'Frank Rosenblatt', isCorrect: false },
    ],
  },
  {
    id: 'q-102',
    question: 'Which event coined the term “artificial intelligence”?',
    reading:
      'The 1956 Dartmouth Summer Research Project, organized by John McCarthy, Marvin Minsky, Nathaniel Rochester and Claude Shannon, is considered AI’s founding workshop. McCarthy coined the term “artificial intelligence” in the proposal.',
    sources: [
      {
        title: 'Harvard – John McCarthy and Marvin Minsky',
        url: 'https://projects.iq.harvard.edu/ai-portal/book/john-mccarthy-and-marvin-minsky',
      },
    ],
    answers: [
      { id: 'a-102-1', label: 'Dartmouth 1956', isCorrect: true },
      { id: 'a-102-2', label: 'Turing test 1950', isCorrect: false },
      { id: 'a-102-3', label: 'Perceptron demo', isCorrect: false },
      { id: 'a-102-4', label: 'Jeopardy! 2011', isCorrect: false },
    ],
  },
  {
    id: 'q-103',
    question: 'What machine did Rosenblatt use for his 1958 perceptron demo?',
    reading:
      'In 1958, Frank Rosenblatt demonstrated the perceptron, an early learning machine, using an IBM 704. The demo drew huge attention but also highlighted limits that later contributed to an “AI winter.”',
    sources: [
      {
        title: 'Cornell Chronicle – Birth of AI: Rosenblatt’s Perceptron',
        url: 'https://news.cornell.edu/stories/2019/07/birth-ai-rosenblatts-perceptron',
      },
    ],
    answers: [
      { id: 'a-103-1', label: 'IBM 704', isCorrect: true },
      { id: 'a-103-2', label: 'Deep Blue', isCorrect: false },
      { id: 'a-103-3', label: 'Watson', isCorrect: false },
      { id: 'a-103-4', label: 'AlphaGo', isCorrect: false },
    ],
  },
  {
    id: 'q-104',
    question: 'Which expert system saved DEC millions but proved brittle?',
    reading:
      'Expert systems peaked in the 1980s. XCON, deployed at Digital Equipment Corporation, configured computer orders and reportedly saved tens of millions annually — but systems like this were costly to build and maintain, and often brittle.',
    sources: [
      {
        title: 'Brewminate – History of Artificial Intelligence (XCON, brittleness)',
        url: 'https://brewminate.com/the-history-of-artificial-intelligence/',
      },
    ],
    answers: [
      { id: 'a-104-1', label: 'XCON', isCorrect: true },
      { id: 'a-104-2', label: 'Watson', isCorrect: false },
    ],
  },
  {
    id: 'q-105',
    question: 'Which champion did IBM’s Deep Blue defeat in 1997?',
    reading:
      'In 1997, IBM’s Deep Blue defeated world chess champion Garry Kasparov. The match showcased brute-force search at supercomputer scale, with Deep Blue evaluating vast numbers of positions per move.',
    sources: [
      {
        title: 'History.com – Kasparov resigns against Deep Blue (1997)',
        url: 'https://www.history.com/this-day-in-history/kasparov-resigns-against-deep-blue',
      },
    ],
    answers: [
      { id: 'a-105-1', label: 'Garry Kasparov', isCorrect: true },
      { id: 'a-105-2', label: 'Lee Sedol', isCorrect: false },
      { id: 'a-105-3', label: 'Fan Hui', isCorrect: false },
      { id: 'a-105-4', label: 'Ken Jennings', isCorrect: false },
    ],
  },
  {
    id: 'q-106',
    question: 'IBM’s Watson beat human champions on which game show (2011)?',
    reading:
      'IBM’s Watson used the DeepQA architecture to parse clues and retrieve answers in natural language. In 2011 it beat two top human champions on the quiz show “Jeopardy!” in a televised match.',
    sources: [
      {
        title: 'NASA – Artificial Intelligence (Watson 2011 match)',
        url: 'https://history.nasa.gov/computers/Artificial_Intelligence.html',
      },
    ],
    answers: [
      { id: 'a-106-1', label: 'Jeopardy!', isCorrect: true },
      { id: 'a-106-2', label: 'Wheel of Fortune', isCorrect: false },
      { id: 'a-106-3', label: 'Countdown', isCorrect: false },
    ],
  },
  {
    id: 'q-107',
    question: 'Which model’s 2012 ImageNet win popularized deep learning?',
    reading:
      'AlexNet’s 2012 ImageNet victory delivered a major accuracy jump and ignited the deep-learning wave in vision. It introduced practical large-scale CNNs trained with GPUs, making deep learning mainstream.',
    sources: [
      {
        title: 'Pinecone – The 2012 AlexNet Paper (ImageNet breakthrough)',
        url: 'https://www.pinecone.io/learn/ai-history-alexnet/',
      },
    ],
    answers: [
      { id: 'a-107-1', label: 'AlexNet', isCorrect: true },
      { id: 'a-107-2', label: 'Deep Blue', isCorrect: false },
      { id: 'a-107-3', label: 'GPT-3', isCorrect: false },
      { id: 'a-107-4', label: 'LeNet-5', isCorrect: false },
    ],
  },
  {
    id: 'q-108',
    question: 'AlphaGo’s 4–1 victory in 2016 was against which Go master?',
    reading:
      'In March 2016, DeepMind’s AlphaGo defeated Lee Sedol 4–1 in a five-game series. It was the first time an AI beat a top-ranked Go professional, signaling a breakthrough for reinforcement learning.',
    sources: [
      {
        title: 'The Guardian – AlphaGo seals 4–1 victory over Lee Sedol',
        url: 'https://www.theguardian.com/technology/2016/mar/15/googles-alphago-seals-4-1-victory-over-grandmaster-lee-sedol',
      },
    ],
    answers: [
      { id: 'a-108-1', label: 'Lee Sedol', isCorrect: true },
      { id: 'a-108-2', label: 'Fan Hui', isCorrect: false },
      { id: 'a-108-3', label: 'Cho Chikun', isCorrect: false },
    ],
  },
]
