export interface DiagramRendererConfig {
  plantUml: {
    enabled: boolean
    server: string
  }
}

export const DEFAULT_PLANTUML_SERVER = 'https://www.plantuml.com/plantuml/svg'
const PLANTUML_SERVER_STORAGE_KEY = 'plantUmlServerOverride'

const DEFAULT_CONFIG: DiagramRendererConfig = {
  plantUml: {
    enabled: true,
    server: DEFAULT_PLANTUML_SERVER,
  },
}

let configPromise: Promise<DiagramRendererConfig> | undefined

function normalizeServer(server: string): string {
  return server.trim().replace(/\/+$/, '')
}

/** 读取用户在设置页保存的 PlantUML Server 地址。 */
export function getPlantUmlServerOverride(): string {
  try {
    return normalizeServer(localStorage.getItem(PLANTUML_SERVER_STORAGE_KEY) ?? '')
  } catch {
    return ''
  }
}

/** 验证并保存自定义 PlantUML Server 地址，返回规范化后的地址。 */
export function savePlantUmlServerOverride(server: string): string {
  const normalized = normalizeServer(server)
  if (!normalized) {
    resetPlantUmlServerOverride()
    return ''
  }

  const url = new URL(normalized)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PlantUML 地址必须使用 http:// 或 https://')
  }
  localStorage.setItem(PLANTUML_SERVER_STORAGE_KEY, normalized)
  return normalized
}

export function resetPlantUmlServerOverride() {
  localStorage.removeItem(PLANTUML_SERVER_STORAGE_KEY)
}

/** 从 public/config/diagram-renderer.json 读取配置，并叠加用户设置。 */
export async function loadDiagramRendererConfig(): Promise<DiagramRendererConfig> {
  if (!configPromise) {
    const configUrl = new URL('config/diagram-renderer.json', document.baseURI)
    configPromise = fetch(configUrl)
      .then(async (response) => {
        if (!response.ok) return DEFAULT_CONFIG
        const value = await response.json() as Partial<DiagramRendererConfig>
        return {
          plantUml: {
            enabled: value.plantUml?.enabled ?? DEFAULT_CONFIG.plantUml.enabled,
            server: normalizeServer(value.plantUml?.server || DEFAULT_CONFIG.plantUml.server),
          },
        }
      })
      .catch(() => DEFAULT_CONFIG)
  }

  const base = await configPromise
  const override = getPlantUmlServerOverride()
  return {
    plantUml: {
      ...base.plantUml,
      server: override || base.plantUml.server,
    },
  }
}

/** PlantUML 官方支持的 ~h 十六进制文本编码，无需额外压缩依赖。 */
export function buildPlantUmlUrl(source: string, server: string): string {
  const bytes = new TextEncoder().encode(source)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${normalizeServer(server)}/~h${hex}`
}