import { type SchemaTypeDefinition } from 'sanity'
import { projectType } from './project' // Importing your new blueprint
import { postType } from './post' // <-- Import the new schema
import { terminalCategory } from './terminalCategory'
import { thesis } from './thesis'
import { siteSettings } from './siteSettings'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [projectType, postType, terminalCategory, thesis, siteSettings], // Registering all types with Sanity
}