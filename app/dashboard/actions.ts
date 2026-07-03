'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createRoom() {
  const supabase = await createClient()

  // Verify the user is authenticated before allowing an insert
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Insert the new room and return the created record
  const { data, error } = await supabase
    .from('rooms')
    .insert([{ host_id: user.id }])
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating room:', error)
    // In a production app, you might want to return an error state here instead of throwing
    throw new Error('Could not create interview room')
  }

  // Redirect the host into their newly created room
  redirect(`/room/${data.id}`)
}