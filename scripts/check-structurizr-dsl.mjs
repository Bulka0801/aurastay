import fs from "node:fs"
import path from "node:path"

const filePath = process.argv[2] ?? "docs/structurizr/workspace.dsl"
const absolutePath = path.resolve(process.cwd(), filePath)

if (!fs.existsSync(absolutePath)) {
  console.error(`FAIL: file does not exist: ${filePath}`)
  process.exit(1)
}

const text = fs.readFileSync(absolutePath, "utf8")
const lines = text.split(/\r?\n/)
const errors = []
const warnings = []

function addError(lineNumber, message) {
  errors.push(lineNumber ? `line ${lineNumber}: ${message}` : message)
}

function addWarning(lineNumber, message) {
  warnings.push(lineNumber ? `line ${lineNumber}: ${message}` : message)
}

let braceBalance = 0
let minBraceBalance = 0
for (const char of text) {
  if (char === "{") braceBalance += 1
  if (char === "}") braceBalance -= 1
  minBraceBalance = Math.min(minBraceBalance, braceBalance)
}

if (braceBalance !== 0) addError(null, `brace balance is ${braceBalance}, expected 0`)
if (minBraceBalance < 0) addError(null, "a closing brace appears before its matching opening brace")
if (/\bundefined\b/.test(text)) addError(null, "file contains the literal word undefined")

const byteLength = Buffer.byteLength(text)
if (byteLength > 50000) {
  addWarning(null, `workspace is ${byteLength} bytes; Structurizr web editor may feel slow`)
}

const identifiers = new Set()
const modelRelationships = new Set()
const modelRelationshipLines = new Map()
let inViews = false
let inDynamicView = false
let blockDepth = 0

function relationshipKey(source, destination) {
  return `${source}->${destination}`
}

for (let index = 0; index < lines.length; index += 1) {
  const lineNumber = index + 1
  const rawLine = lines[index]
  const line = rawLine.trim()
  const sectionBeforeLine = inDynamicView ? "dynamic" : inViews ? "view" : "model"

  const assignment = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(person|softwareSystem|container|component)\b/)
  if (assignment) identifiers.add(assignment[1])

  if (line === "views {") {
    inViews = true
  }

  const viewStart = line.match(/^(systemContext|container|component|dynamic)\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]+)"/)
  if (viewStart) {
    inDynamicView = viewStart[1] === "dynamic"
    const scope = viewStart[2]
    if (!identifiers.has(scope)) addError(lineNumber, `view scope '${scope}' is not defined in model`)
  }

  const include = line.match(/^include\s+([A-Za-z_][A-Za-z0-9_]*)$/)
  if (include && !identifiers.has(include[1])) {
    addError(lineNumber, `include '${include[1]}' is not defined in model`)
  }

  const relationship = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]*)"/)
  if (relationship) {
    const [, source, destination] = relationship
    if (!identifiers.has(source)) addError(lineNumber, `relationship source '${source}' is not defined`)
    if (!identifiers.has(destination)) addError(lineNumber, `relationship destination '${destination}' is not defined`)

    const key = relationshipKey(source, destination)
    if (sectionBeforeLine === "dynamic") {
      if (!modelRelationships.has(key)) {
        addError(lineNumber, `dynamic relationship '${source} -> ${destination}' does not exist in model`)
      }
    } else if (sectionBeforeLine === "model") {
      if (modelRelationships.has(key)) {
        addError(
          lineNumber,
          `duplicate model relationship '${source} -> ${destination}' already exists at line ${modelRelationshipLines.get(key)}`,
        )
      } else {
        modelRelationships.add(key)
        modelRelationshipLines.set(key, lineNumber)
      }
    }
  }

  for (const char of rawLine) {
    if (char === "{") blockDepth += 1
    if (char === "}") blockDepth -= 1
  }

  if (inDynamicView && line === "}") {
    inDynamicView = false
  }
}

const componentCount = [...text.matchAll(/\s=\scomponent\s/g)].length
const relationshipCount = [...text.matchAll(/\s->\s/g)].length

console.log(`Checked ${filePath}`)
console.log(`Size: ${byteLength} bytes`)
console.log(`Components: ${componentCount}`)
console.log(`Relationships: ${relationshipCount}`)
console.log(`Brace balance: ${braceBalance}`)

if (warnings.length > 0) {
  console.log("")
  console.log("Warnings:")
  for (const warning of warnings) console.log(`- ${warning}`)
}

if (errors.length > 0) {
  console.log("")
  console.log("Errors:")
  for (const error of errors) console.log(`- ${error}`)
  process.exit(1)
}

console.log("")
console.log("OK: no local DSL consistency problems found.")
