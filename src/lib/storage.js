import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se as variáveis de ambiente não estiverem configuradas, usa localStorage
const useSupabase = !!SUPABASE_URL && !!SUPABASE_KEY
const supabase = useSupabase ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

const LOCAL_KEY = 'graduu_parceiros_data'

function getLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : { users: [], leads: [] }
  } catch { return { users: [], leads: [] } }
}

function setLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
}

export async function loadData() {
  if (!useSupabase) return getLocal()
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', 'main')
      .single()
    if (error || !data) return { users: [], leads: [] }
    return JSON.parse(data.value)
  } catch { return getLocal() }
}

export async function saveData(newData) {
  if (!useSupabase) { setLocal(newData); return }
  try {
    await supabase
      .from('app_data')
      .upsert({ key: 'main', value: JSON.stringify(newData) }, { onConflict: 'key' })
  } catch { setLocal(newData) }
}
