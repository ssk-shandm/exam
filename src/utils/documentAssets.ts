export type DocumentImageAsset = {
  id: string
  fileName: string
  blob: Blob
  sourceFile: string
  sourceIndex: number
  nearbyText: string
}

export type ExtractedDocument = {
  text: string
  images: DocumentImageAsset[]
}

type ImageReference = {
  relationshipId: string
  assetId: string
  sourceIndex: number
  nearbyText: string
}

const IMAGE_RELATIONSHIP_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
const RELATIONSHIP_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** Extract DOCX text and embedded images while preserving image positions. */
export async function extractDocxDocument(file: File, imageOffset = 0): Promise<ExtractedDocument> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const documentEntry = zip.file('word/document.xml')
  const relationshipsEntry = zip.file('word/_rels/document.xml.rels')
  if (!documentEntry || !relationshipsEntry) throw new Error('DOCX 缺少 document.xml 或图片关系文件。')

  const [documentXml, relationshipsXml] = await Promise.all([
    documentEntry.async('text'),
    relationshipsEntry.async('text'),
  ])
  const parser = new DOMParser()
  const document = parser.parseFromString(documentXml, 'application/xml')
  const relationships = parser.parseFromString(relationshipsXml, 'application/xml')
  assertValidXml(document, 'DOCX document.xml')
  assertValidXml(relationships, 'DOCX document.xml.rels')

  const relationshipTargets = new Map<string, string>()
  for (const relation of Array.from(relationships.getElementsByTagName('Relationship'))) {
    const id = relation.getAttribute('Id')
    const target = relation.getAttribute('Target')
    const type = relation.getAttribute('Type')
    if (id && target && type === IMAGE_RELATIONSHIP_TYPE) relationshipTargets.set(id, normalizeDocxTarget(target))
  }

  const references: ImageReference[] = []
  const paragraphs: string[] = []
  let paragraphImageIndex = 0
  let assetIndex = 0
  let lastParagraphText = ''
  const assetIdsByRelationship = new Map<string, string>()

  for (const paragraph of Array.from(document.getElementsByTagName('w:p'))) {
    let text = ''
    const walk = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        const element = child as Element
        const localName = element.localName ?? child.nodeName.split(':').pop()
        if (localName === 't') text += child.textContent ?? ''
        else if (localName === 'tab') text += '\t'
        else if (localName === 'br' || localName === 'cr') text += '\n'
        else if (localName === 'blip' || localName === 'imagedata') {
          const relationshipId = localName === 'blip'
            ? element.getAttribute('r:embed') ?? element.getAttributeNS(RELATIONSHIP_NS, 'embed')
            : element.getAttribute('r:id') ?? element.getAttributeNS(RELATIONSHIP_NS, 'id')
          if (!relationshipId || !relationshipTargets.has(relationshipId)) continue
          paragraphImageIndex += 1
          let assetId = assetIdsByRelationship.get(relationshipId)
          if (!assetId) {
            assetIndex += 1
            assetId = `img-${String(imageOffset + assetIndex).padStart(3, '0')}`
            assetIdsByRelationship.set(relationshipId, assetId)
          }
          references.push({ relationshipId, assetId, sourceIndex: imageOffset + paragraphImageIndex, nearbyText: text.trim() || lastParagraphText })
          text += `\n<source_image id="${assetId}"/>\n`
        } else walk(child)
      }
    }
    walk(paragraph)
    const normalized = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (normalized) {
      paragraphs.push(normalized)
      lastParagraphText = normalized.replace(/<source_image[^>]*\/>/g, '').trim()
    }
  }

  const assetsByTarget = new Map<string, DocumentImageAsset>()
  const assets: DocumentImageAsset[] = []
  for (const reference of references) {
    const target = relationshipTargets.get(reference.relationshipId)
    if (!target || assetsByTarget.has(target)) continue
    const entry = zip.file(target)
    if (!entry) continue
    const blob = await entry.async('blob')
    const extension = getExtension(target, blob.type)
    const topic = reference.nearbyText || '题目配图'
    const ordinal = reference.assetId.match(/img-(\d+)$/)?.[1] ?? String(assets.length + 1).padStart(3, '0')
    const fileName = `img-${ordinal}.${extension}`
    const asset: DocumentImageAsset = {
      id: reference.assetId,
      fileName,
      blob,
      sourceFile: file.name,
      sourceIndex: reference.sourceIndex,
      nearbyText: topic.slice(0, 120),
    }
    assetsByTarget.set(target, asset)
    assets.push(asset)
  }

  return { text: paragraphs.join('\n\n'), images: assets }
}

function assertValidXml(document: XMLDocument, label: string) {
  if (document.getElementsByTagName('parsererror').length > 0) throw new Error(`${label} 解析失败。`)
}

function normalizeDocxTarget(target: string) {
  const normalized = target.replace(/^\.\//, '').replace(/^\//, '')
  if (normalized.startsWith('word/')) return normalized
  if (normalized.startsWith('../media/') || normalized.startsWith('media/')) return `word/${normalized.replace(/^\.\.\//, '')}`
  return `word/${normalized.replace(/^\.\.\//, '')}`
}

function getExtension(path: string, mimeType: string) {
  return path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || mimeType.split('/')[1]?.split('+')[0] || 'bin'
}
