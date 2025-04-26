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
