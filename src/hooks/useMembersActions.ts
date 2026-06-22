import { useCallback } from 'react'
import type { Member } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { CreateMemberDTO } from './useMembers.types'

interface UseMembersActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  loadMembers: () => Promise<void>
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
}

export function useMembersActions(deps: UseMembersActionsDeps) {
  const { setError, setMembers, loadMembers, selectedMember, setSelectedMember } = deps

  // 创建成员
  const create = useCallback(async (data: CreateMemberDTO): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createMember(data as Member)

      if (result.success) {
        await loadMembers()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadMembers, setError])

  // 更新成员
  const update = useCallback(async (member: Member): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateMember(member)

      if (result.success) {
        await loadMembers()
        if (selectedMember?.id === member.id) {
          setSelectedMember(member)
        }
        return { success: true }
      }

      const errorMsg = result.error || '更新人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadMembers, selectedMember, setSelectedMember, setError])

  // 删除成员
  const deleteMember = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteMember(id)

      if (result.success) {
        setMembers(prev => prev.filter(m => m.id !== id))
        if (selectedMember?.id === id) {
          setSelectedMember(null)
        }
        return { success: true }
      }

      const errorMsg = result.error || '删除人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedMember, setMembers, setSelectedMember, setError])

  return { create, update, deleteMember }
}