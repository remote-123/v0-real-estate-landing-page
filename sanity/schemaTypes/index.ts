import { type SchemaTypeDefinition } from 'sanity'
import { projectType } from './project'
import { postType } from './post'
import { terminalCategory } from './terminalCategory'
import { thesis } from './thesis'
import { siteSettings } from './siteSettings'
import { xPost } from './xPost'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [projectType, postType, terminalCategory, thesis, siteSettings, xPost],
}