/**
 * SeededRNG (Seeded Random Number Generator)
 *
 * This class provides deterministic pseudo-random number generation using a seed value.
 * Unlike Math.random(), which produces different sequences each time you run your program,
 * a seeded RNG will always produce the same sequence of "random" numbers when given the
 * same starting seed. This is useful for:
 *
 * - Testing: You can reproduce the exact same random behavior by using the same seed
 * - Game development: Players can share seeds to experience identical random events
 * - Debugging: Random bugs become reproducible when you know the seed
 * - Procedural generation: Create consistent worlds/levels from a seed
 */
export class SeededRNG {
  private seed: number

  /**
   * Creates a new seeded random number generator
   * @param seed - The initial seed value. Same seed = same sequence of random numbers
   */
  constructor(seed: number) {
    this.seed = seed
  }

  /**
   * Generates the next pseudo-random number in the sequence (0 to 1)
   *
   * Uses a Linear Congruential Generator (LCG) algorithm:
   * - Takes the current seed
   * - Applies mathematical transformations (multiply, add, modulo)
   * - Updates the internal seed for the next call
   * - Returns a normalized value between 0 and 1
   *
   * @returns A pseudo-random number between 0 and 1 (exclusive of 1)
   */
  next(): number {
    // Linear congruential generator (LCG) parameters from Numerical Recipes
    // Formula: next_seed = (a * seed + c) mod m
    // where a=1664525, c=1013904223, m=2^32
    this.seed = (this.seed * 1664525 + 1013904223) % 0xffffffff

    // Convert the seed (0 to 4294967295) to a decimal between 0 and 1
    return this.seed / 0xffffffff
  }

  /**
   * Shuffles an array using the Fisher-Yates algorithm with our seeded RNG
   *
   * This creates a random permutation of the input array. Unlike using Math.random()
   * for shuffling, this will produce the same shuffle order when given the same seed.
   *
   * @param array - The array to shuffle (original array is not modified)
   * @returns A new shuffled array
   */
  shuffle<T>(array: T[]): T[] {
    // Create a copy so we don't modify the original array
    const arr = array.slice()

    // Fisher-Yates shuffle algorithm:
    // Start from the last element and work backwards
    for (let i = arr.length - 1; i > 0; i--) {
      // Pick a random index from 0 to i (inclusive)
      const j = Math.floor(this.next() * (i + 1))

      // Swap the current element with the randomly selected element
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
  }
}
