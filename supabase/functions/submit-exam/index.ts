import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const formData = await req.formData()
    const submissionId = formData.get('submission_id')
    const file = formData.get('file')

    if (!submissionId || !file) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id or file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!file.name.endsWith('.zip')) {
      return new Response(
        JSON.stringify({ error: 'Only .zip files are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (file.size > 100 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 100 MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (subErr || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date()
    const deadline = new Date(submission.deadline_at)

    if (submission.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'This exam has already been submitted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (submission.status === 'expired' || now > deadline) {
      await supabase
        .from('submissions')
        .update({ status: 'expired', submitted_at: now.toISOString() })
        .eq('id', submissionId)
        .eq('status', 'in_progress')

      return new Response(
        JSON.stringify({ error: "Time's up — this exam can no longer be submitted." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const filePath = `${submissionId}/${file.name}`

    const { error: upErr } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, { contentType: 'application/zip', upsert: false })

    if (upErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { error: updErr } = await supabase
      .from('submissions')
      .update({
        file_path: filePath,
        submitted_at: now.toISOString(),
        status: 'submitted',
      })
      .eq('id', submissionId)

    if (updErr) {
      await supabase.storage.from('submissions').remove([filePath])
      return new Response(
        JSON.stringify({ error: 'Failed to update submission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
