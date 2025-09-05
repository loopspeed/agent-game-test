import type { Question } from '../resources/questions';

// Generate slot positions for a ring given number of answers and radius
export function generateSlots(question: Question, radius: number): { id: string; label: string; isCorrect: boolean; position: [number, number, number]; }[] {
  const slots = question.answers.length;
  const angleStep = (Math.PI * 2) / slots;
  return question.answers.map((ans, idx) => {
    const angle = angleStep * idx;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return {
      id: ans.id,
      label: ans.label,
      isCorrect: ans.isCorrect,
      position: [x, y, 0],
    };
  });
}

// Placeholder spawn function; in real implementation this would allocate from a pool and add to scene
export function spawnRing(/* params */) {
  // TODO: implement ring spawning logic
}