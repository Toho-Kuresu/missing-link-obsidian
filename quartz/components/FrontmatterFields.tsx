import { QuartzPluginData } from "../plugins/vfile"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

type FrontmatterRecord = Record<string, unknown>

interface FrontmatterFieldsOptions {
  variant: "block" | "inline"
}

interface FrontmatterFieldsDisplayProps {
  frontmatter?: FrontmatterRecord
  variant?: "block" | "inline"
  className?: string
}

const RESERVED_FRONTMATTER_KEYS = new Set([
  "title",
  "tags",
  "aliases",
  "cssclasses",
  "description",
  "draft",
  "publish",
  "date",
  "created",
  "updated",
  "modified",
  "publishDate",
  "permalink",
  "comments",
  "enableToc",
  "socialImage",
])

const SORT_PRIORITY_KEYS = ["sort", "order", "index", "sortOrder", "Scenario", "scenario", "era", "type", "rank", "species"]
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" })

const defaultOptions: FrontmatterFieldsOptions = {
  variant: "block",
}

function compareKeys(left: string, right: string): number {
  const leftPriority = SORT_PRIORITY_KEYS.indexOf(left)
  const rightPriority = SORT_PRIORITY_KEYS.indexOf(right)

  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1
    if (rightPriority === -1) return -1
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
  }

  return collator.compare(left, right)
}

function normalizeValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeValue(entry))
      .filter((entry): entry is string => entry !== undefined)
    return normalized.length > 0 ? normalized.join(", ") : undefined
  }

  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return JSON.stringify(value)
}

function formatValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeValue(entry))
      .filter((entry): entry is string => entry !== undefined)
    return normalized.length > 0 ? normalized : ["未設定"]
  }

  return [normalizeValue(value) ?? "未設定"]
}

function compareValues(left: unknown, right: unknown): number {
  const leftValue = normalizeValue(left)
  const rightValue = normalizeValue(right)

  if (leftValue && rightValue) {
    return collator.compare(leftValue, rightValue)
  }

  if (leftValue) {
    return -1
  }

  if (rightValue) {
    return 1
  }

  return 0
}

export function getCustomFrontmatterEntries(frontmatter?: FrontmatterRecord): Array<[string, unknown]> {
  if (!frontmatter) {
    return []
  }

  return Object.entries(frontmatter)
    .filter(([key]) => !RESERVED_FRONTMATTER_KEYS.has(key))
    .sort(([leftKey], [rightKey]) => compareKeys(leftKey, rightKey))
}

export function compareCustomFrontmatter(left: QuartzPluginData, right: QuartzPluginData): number {
  const leftFrontmatter = left.frontmatter as FrontmatterRecord | undefined
  const rightFrontmatter = right.frontmatter as FrontmatterRecord | undefined
  const keys = new Set<string>()

  getCustomFrontmatterEntries(leftFrontmatter).forEach(([key]) => keys.add(key))
  getCustomFrontmatterEntries(rightFrontmatter).forEach(([key]) => keys.add(key))

  return [...keys].sort(compareKeys).reduce((result, key) => {
    if (result !== 0) {
      return result
    }

    return compareValues(leftFrontmatter?.[key], rightFrontmatter?.[key])
  }, 0)
}

export function FrontmatterFieldsDisplay({
  frontmatter,
  variant = "block",
  className,
}: FrontmatterFieldsDisplayProps) {
  const entries = getCustomFrontmatterEntries(frontmatter)
  if (entries.length === 0) {
    return null
  }

  const classes = ["frontmatter-fields", variant]
  if (className) {
    classes.push(className)
  }

  return (
    <dl class={classes.join(" ")}>
      {entries.map(([key, value]) => (
        <div class="frontmatter-field">
          <dt class="frontmatter-field-key">{key}</dt>
          <dd class="frontmatter-field-value">
            {formatValues(value).map((entry) => (
              <span class="frontmatter-value-chip">{entry}</span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export const frontmatterFieldsStyles = `
.frontmatter-fields {
  margin: 1rem 0 0;
}

.frontmatter-fields.block {
  display: grid;
  gap: 0.75rem;
}

.frontmatter-fields.inline {
  margin-top: 0.35rem;
}

.frontmatter-field {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}

.frontmatter-field-key {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--darkgray);
}

.frontmatter-field-value {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.frontmatter-value-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--highlight);
  color: var(--dark);
  font-size: 0.85rem;
  line-height: 1.4;
}

.frontmatter-fields.inline .frontmatter-field-key {
  font-size: 0.75rem;
}

.frontmatter-fields.inline .frontmatter-value-chip {
  font-size: 0.75rem;
}
`

export default ((opts?: Partial<FrontmatterFieldsOptions>) => {
  const options: FrontmatterFieldsOptions = { ...defaultOptions, ...opts }

  const FrontmatterFields: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => (
    <FrontmatterFieldsDisplay
      frontmatter={fileData.frontmatter as FrontmatterRecord | undefined}
      variant={options.variant}
      className={displayClass}
    />
  )

  FrontmatterFields.css = frontmatterFieldsStyles
  return FrontmatterFields
}) satisfies QuartzComponentConstructor<Partial<FrontmatterFieldsOptions>>