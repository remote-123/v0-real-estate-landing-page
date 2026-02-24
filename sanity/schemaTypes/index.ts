import { type SchemaTypeDefinition } from 'sanity'
import { projectType } from './project' // Importing your new blueprint
import { postType } from './post' // <-- Import the new schema

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [projectType, postType], // Registering both types with Sanity

}