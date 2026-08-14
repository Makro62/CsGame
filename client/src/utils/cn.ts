/**
 * Classname utility - combines clsx and tailwind-merge
 * Removes duplicate/conflicting Tailwind classes while preserving order
 */

type ClassValue = string | undefined | null | false | ClassValue[]

function clsx(...classes: ClassValue[]): string {
  const result: string[] = []

  const flatten = (arr: ClassValue[]) => {
    for (const item of arr) {
      if (typeof item === 'string' && item.length > 0) {
        result.push(item)
      } else if (Array.isArray(item)) {
        flatten(item)
      }
    }
  }

  flatten(classes)
  return result.join(' ')
}

// Simple tailwind-merge implementation for common conflicts
function mergeTailwindClasses(input: string): string {
  const classes = input.split(/\s+/).filter(Boolean)
  const classMap = new Map<string, string>()

  // Define Tailwind class prefixes that conflict
  const conflictGroups = [
    // Sizing
    /^(w-|min-w-|max-w-)/,
    /^(h-|min-h-|max-h-)/,
    // Positioning
    /^(top-|right-|bottom-|left-|inset-)/,
    // Display
    /^(block|inline|flex|grid|hidden|relative|absolute|fixed|sticky)/,
    // Padding
    /^p(x-|y-|-|t-|r-|b-|l-)?/,
    // Margin
    /^m(x-|y-|-|t-|r-|b-|l-)?/,
    // Colors
    /^(bg-|text-|border-|from-|to-|via-)/,
    // Opacity
    /^opacity-/,
    // Background
    /^bg-/,
    // Text
    /^(text-|font-)/,
    // Borders
    /^border/,
    // Flex
    /^flex-/,
    // Grid
    /^grid-/,
    // Animation
    /^animate-/,
    // Transform
    /^(transform|translate|rotate|scale|skew|origin-)/,
    // Transition
    /^transition/,
    // Cursor
    /^cursor-/,
  ]

  for (const cls of classes) {
    let foundGroup = false
    for (const group of conflictGroups) {
      if (group.test(cls)) {
        // Keep the last occurrence (rightmost takes precedence)
        classMap.set(group.source, cls)
        foundGroup = true
        break
      }
    }
    // If no conflict group found, always keep it
    if (!foundGroup) {
      classMap.set(cls, cls)
    }
  }

  // Preserve original order for non-conflicting classes
  const result: string[] = []
  const seen = new Set<string>()

  for (const cls of classes) {
    for (const [, value] of classMap.entries()) {
      if (value === cls && !seen.has(value)) {
        result.push(value)
        seen.add(value)
        break
      }
    }
  }

  return result.join(' ')
}

/**
 * Combines classnames and removes duplicate/conflicting Tailwind classes
 */
export function cn(...classes: ClassValue[]): string {
  const merged = clsx(...classes)
  return mergeTailwindClasses(merged)
}

export default cn
