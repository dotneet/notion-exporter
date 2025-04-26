/**
 * Notion Exporter - Type Definitions
 */

import {
  type BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints"

/**
 * Export result interface
 */
export interface ExportResult {
  success: boolean
  pageId: string
  pageTitle: string
  path: string
}

/**
 * Subpage information
 */
export interface SubpageInfo {
  id: string
  title: string
}

/**
 * Extended block with children property
 */
export type BlockWithChildren = BlockObjectResponse & {
  children?: BlockObjectResponse[]
}

/**
 * Notion API Error type
 */
export interface NotionAPIError extends Error {
  code?: string
  status?: number
}

/**
 * Rich text type from Notion API
 */
export interface NotionRichText {
  plain_text: string
  href?: string | null
  annotations?: {
    bold?: boolean
    italic?: boolean
    strikethrough?: boolean
    underline?: boolean
    code?: boolean
    color?: string
  }
  type?: string
  text?: {
    content: string
    link?: { url: string } | null
  }
}
