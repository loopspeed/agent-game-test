// To be used inside an array filter i.e. array.filter(removeDuplicates)
export const removeDuplicates = (i: any, index: number, array: any[]) => array.indexOf(i) === index

export const removeDuplicatesCaseInsensitive = (array: string[]): string[] => {
  return array.filter((value, index, self) => index === self.findIndex((t) => t.toLowerCase() === value.toLowerCase()))
}

export const removeDuplicatesByProperty = <T>(array: T[], property: keyof T): T[] => {
  return array.filter((value, index, self) => index === self.findIndex((t) => t[property] === value[property]))
}

export const arrayToList = (array: string[]) => {
  return array.join(', ').replace(/, ((?:.(?!, ))+)$/, ' and $1')
}

export const partitionArray = (array: any[], predicate: (item: any) => boolean) => {
  return array.reduce(
    (result, element) => {
      result[predicate(element) ? 0 : 1].push(element) // Determine and push to small/large arr
      return result
    },
    [[], []],
  )
}

export function arraysContainSameElements<DataType>(array1: DataType[], array2: DataType[]): boolean {
  if (array1.length !== array2.length) return false
  return array1.every((element) => array2.includes(element))
}

export function mergeArrays<ArrayType>(arr1: ArrayType[] = [], arr2: ArrayType[] = []): ArrayType[] {
  return [...arr1, ...arr2].filter(removeDuplicates)
}

export function createBatchOfElements<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += batchSize) {
    const chunk = array.slice(i, i + batchSize)
    batches.push(chunk)
  }
  return batches
}

export const isSpace = (char: string): boolean => {
  if (char === ' ' || char === '.') return true
  return false
}

export const truncateString = (string: string, characterLimit = 60) => {
  if (!string) return ''
  if (string.length <= characterLimit) return string
  return string.substring(0, characterLimit) + '...'
}

export const truncateStringToNearestWord = (string: string, characterLimit = 60) => {
  if (!string) return ''
  if (string.length <= characterLimit) return string

  const newString = string.substring(0, characterLimit)
  const last = newString.length - 1
  let index = last

  for (index = last; index > -1; index--) {
    const char = newString.charAt(index)
    if (isSpace(char)) break
  }

  return newString.substring(0, index) + '...'
}

function checkIfValidEmail(email: string) {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

export const validateEmail = (email: string): boolean => {
  let isValid = true
  if (checkIfValidEmail(email.trim())) {
    isValid = false
  }
  return isValid
}

export function getRandomInt(min: number, max: number) {
  return Math.round(Math.random() * Math.abs(max - min) + min)
}

export const copyToClipboard = async (string: string) => {
  try {
    await navigator.clipboard.writeText(string)
  } catch (error) {
    const el = document.createElement('textarea') // Create a <textarea> element
    el.value = string // Set its value to the string that you want copied
    el.setAttribute('readonly', '') // Make it readonly to be tamper-proof
    el.style.position = 'absolute'
    el.style.left = '-9999px' // Move outside the screen to make it invisible
    document.body.appendChild(el) // Append the <textarea> element to the HTML document

    el.select() // Select the <textarea> content
    document.execCommand('copy') // Copy - only works as a result of a user action (e.g. click events)
    document.body.removeChild(el) // Remove the <textarea> element
  }
}

export const getUrlValidationError = (stringToCheck: string): string | undefined => {
  if (stringToCheck.includes(' ')) return 'URL cannot contain spaces'
  try {
    const url = new URL(stringToCheck)
    const hasProtocol = url.protocol === 'http:' || url.protocol === 'https:'
    if (!hasProtocol) return 'URL must start with http:// or https://'
  } catch (error) {
    return 'URL must include http(s):// and a domain name'
  }
}

export const isValidHttpUrl = (url: string): boolean => {
  return !getUrlValidationError(url)
}

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (res.ok) return res.json()
  const error = await res.json()
  error.statusCode = res.status
  throw error
}

export function base64ToBlob(base64Data: string) {
  // Decode the base64 string
  const byteCharacters = atob(base64Data)

  // Create an array of bytes from the base64 string
  const byteArray = new Uint8Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }

  // Create a Blob from the byte array
  return new Blob([byteArray], { type: 'application/octet-stream' })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadFile(content: any, fileName: string, contentType: string) {
  const file = new Blob([content], { type: contentType })
  downloadBlob(file, fileName)
}

export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0
}

const isObject = (object: any): boolean =>
  object != null && typeof object === 'object' && Array.isArray(object) === false

export const deepEqual = (object1: Record<string, any>, object2: Record<string, any>): boolean => {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)
  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    const val1 = object1[key]
    const val2 = object2[key]
    const areObjects = isObject(val1) && isObject(val2)
    const areArrays = Array.isArray(val1) && Array.isArray(val2)
    if (
      (areObjects && !deepEqual(val1, val2)) ||
      (areArrays && JSON.stringify(val1) !== JSON.stringify(val2)) ||
      (!areObjects && !areArrays && val1 !== val2)
    )
      return false
  }

  return true
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return function (this: any, ...args: Parameters<T>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-1xxx-axxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
