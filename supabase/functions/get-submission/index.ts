import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { submission_id } = await req.json()
    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, student_name, started_at, deadline_at, submitted_at, status')
      .eq('id', submission_id)
      .single()

    if (error || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date()
    const deadline = new Date(submission.deadline_at)
    if (submission.status === 'in_progress' && now > deadline) {
      await supabase
        .from('submissions')
        .update({ status: 'expired' })
        .eq('id', submission_id)
      submission.status = 'expired'
    }

    return new Response(
      JSON.stringify(submission),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
