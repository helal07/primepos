import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  in_review: 'pending',
  delivery_in_progress: 'in_transit',
  shipped: 'shipped',
  delivered: 'delivered',
  partial_delivered: 'delivered',
  cancelled: 'cancelled',
  hold: 'in_transit',
  unknown: 'in_transit',
  delivered_approval_pending: 'in_transit',
  partial_delivered_approval_pending: 'in_transit',
  cancelled_approval_pending: 'in_transit',
  unknown_approval_pending: 'in_transit',
  return: 'returned',
  returned: 'returned',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const body = await req.json().catch(() => ({}))
    const consignmentId = String(body.consignment_id || body.notification_value || '')
    const tracking = String(body.tracking_code || '')
    const status = String(body.status || '').toLowerCase()
    if (!consignmentId && !tracking) return json({ error: 'consignment_id or tracking_code required' }, 400)

    const query = admin.from('shipments').select('*').limit(1)
    if (consignmentId) query.eq('courier_consignment_id', consignmentId)
    else query.eq('tracking_no', tracking)
    const { data: rows } = await query
    const shipment = rows?.[0]
    if (!shipment) return json({ ok: true, ignored: true })

    const mapped = STATUS_MAP[status] || shipment.status
    await admin.from('shipments').update({
      status: mapped,
      courier_status: status,
      delivered_at: mapped === 'delivered' ? new Date().toISOString() : shipment.delivered_at,
    }).eq('id', shipment.id)

    await admin.from('shipment_status_history').insert({
      tenant_id: shipment.tenant_id,
      shipment_id: shipment.id,
      status: mapped,
      note: `Steadfast: ${status}`,
    })
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}