import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

const isValidProjectId = /^[a-z0-9][-a-z0-9]*$/.test(projectId)

export const client = isValidProjectId
  ? createClient({
      projectId,
      dataset: dataset || 'production',
      apiVersion,
      useCdn: true,
    })
  : null
