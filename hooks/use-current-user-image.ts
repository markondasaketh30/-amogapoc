import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error(error)
        }
        setImage(data.session?.user.user_metadata.avatar_url ?? null)
      } catch (error) {
        // Supabase not configured, skip silently
      }
    }
    fetchUserImage()
  }, [])

  return image
}
