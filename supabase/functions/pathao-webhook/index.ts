import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const STATUS_MAP: Record<string, string> = {
  'Pickup_Requested': 'pending',
  'Assigned_for_Pickup': 'pending',
  'Picked': 'packed',
  'At_the_Sorting_HUB': 'in_transit',
  'In_Transit': 'in_transit',
  'Received_at_Last_Mile_Hub': 'in_transit',
  'Assigned_for_Delivery': 'in_transit',
  'Delivered': 'delivered',
  'Partial_Delivery': 'delivered',
  'Return': 'returned',
  'Returned': 'returned',
  'Cancelled': 'cancelled',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const body = await req.json().catch(() => ({}))
    const consignmentId = String(body.consignment_id || body.data?.consignment_id || '')
    const order = String(body.order_status || body.data?.order_status || body.event || '')
    if (!consignmentId) return json({ error: 'consignment_id required' }, 400)

    const { data: shipment } = await admin.from('shipments').select('*').eq('courier_consignment_id', consignmentId).maybeSingle()
    if (!shipment) return json({ ok: true, ignored: true })

    const mapped = STATUS_MAP[order] || shipment.status
    await admin.from('shipments').update({
      status: mapped,
      courier_status: order,
      delivered_at: mapped === 'delivered' ? new Date().toISOString() : shipment.delivered_at,
    }).eq('id', shipment.id)

    await admin.from('shipment_status_history').insert({
      tenant_id: shipment.tenant_id,
      shipment_id: shipment.id,
      status: mapped,
      note: `Pathao: ${order}`,
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