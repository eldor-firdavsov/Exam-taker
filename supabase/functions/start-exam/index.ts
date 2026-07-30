import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token, student_name } = await req.json()
    if (!token || !student_name) {
      return new Response(
        JSON.stringify({ error: 'Missing token or student_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: link, error: linkErr } = await supabase
      .from('exam_links')
      .select('id, exam_id, expires_at')
      .eq('token', token)
      .single()

    if (linkErr || !link) {
      return new Response(
        JSON.stringify({ error: 'Invalid exam link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This exam link has expired.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('duration_minutes')
      .eq('id', link.exam_id)
      .single()

    if (examErr || !exam) {
      return new Response(
        JSON.stringify({ error: 'Exam not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check for existing submission by same student + same link
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, deadline_at, status')
      .eq('exam_link_id', link.id)
      .eq('student_name', student_name)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'in_progress') {
        return new Response(
          JSON.stringify({ submission_id: existing.id, deadline_at: existing.deadline_at }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (existing.status === 'submitted') {
        return new Response(
          JSON.stringify({ error: 'You have already submitted this exam.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ error: 'This exam session has expired.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date()
    const deadline = new Date(now.getTime() + exam.duration_minutes * 60_000)

    const { data: submission, error: insErr } = await supabase
      .from('submissions')
      .insert({
        exam_link_id: link.id,
        student_name,
        started_at: now.toISOString(),
        deadline_at: deadline.toISOString(),
        status: 'in_progress',
      })
      .select('id, deadline_at')
      .single()

    if (insErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to create submission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ submission_id: submission.id, deadline_at: submission.deadline_at }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
