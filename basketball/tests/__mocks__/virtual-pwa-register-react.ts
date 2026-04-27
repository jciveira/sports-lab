import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export function useRegisterSW() {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return {
    needRefresh: needRefresh as [boolean, Dispatch<SetStateAction<boolean>>],
    offlineReady: offlineReady as [boolean, Dispatch<SetStateAction<boolean>>],
    updateServiceWorker: async (_reloadPage?: boolean) => {},
  }
}
