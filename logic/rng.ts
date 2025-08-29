export class SeededRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    // Linear congruential generator (LCG) parameters from Numerical Recipes
    this.seed = (this.seed * 1664525 + 1013904223) % 0xffffffff;
    return this.seed / 0xffffffff;
  }
  shuffle<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}