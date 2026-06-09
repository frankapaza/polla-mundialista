import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ygxdsoqgtkarrouzweyx.supabase.co',
  'sb_publishable_0qxabUp40Krg_99nV-xBJg_SY4oaZYG'
)

const { data, error } = await supabase.from('grupos').select('count').limit(1)
console.log('data:', data)
console.log('error:', error?.message ?? 'ninguno')
