'use client'
import { parseAsString, parseAsIsoDateTime, useQueryState } from 'nuqs'

const DEFAULT_START_DATE = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const DEFAULT_END_DATE = () => new Date()

export function useFilterParams() {
  const [startDate, setStartDate] = useQueryState(
    'startDate',
    parseAsIsoDateTime.withDefault(DEFAULT_START_DATE())
  )
  const [endDate, setEndDate] = useQueryState(
    'endDate',
    parseAsIsoDateTime.withDefault(DEFAULT_END_DATE())
  )
  const [repoId, setRepoId] = useQueryState('repoId', parseAsString)
  const [developerId, setDeveloperId] = useQueryState('developerId', parseAsString)
  const [state, setState] = useQueryState('state', parseAsString)
  const [branch, setBranch] = useQueryState('branch', parseAsString)
  const [page, setPage] = useQueryState('page', parseAsString.withDefault('0'))
  const [metric, setMetric] = useQueryState('metric', parseAsString.withDefault('prs_merged'))

  const setPreset = (days: number) => {
    setStartDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    setEndDate(new Date())
    setPage('0')
  }

  const toApiParams = () => ({
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    ...(repoId ? { repo_id: repoId } : {}),
    ...(developerId ? { developer_id: developerId } : {}),
    ...(state ? { state } : {}),
    ...(branch ? { branch } : {}),
    offset: (parseInt(page) * 50).toString(),
    limit: '50',
  })

  return {
    startDate, setStartDate,
    endDate, setEndDate,
    repoId, setRepoId,
    developerId, setDeveloperId,
    state, setState,
    branch, setBranch,
    page, setPage,
    metric, setMetric,
    setPreset,
    toApiParams,
  }
}
