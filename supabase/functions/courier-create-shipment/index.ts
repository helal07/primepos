import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const shipmentId = String(body.shipment_id || '')
    const provider = String(body.provider || '').toLowerCase()
    if (!shipmentId || !['pathao', 'steadfast'].includes(provider)) {
      return json({ error: 'shipment_id and provider (pathao|steadfast) required' }, 400)
    }

    const { data: profile } = await admin.from('profiles').select('tenant_id').eq('user_id', userId).maybeSingle()
    const tenantId = profile?.tenant_id
    if (!tenantId) return json({ error: 'No tenant' }, 403)

    const { data: shipment, error: sErr } = await admin.from('shipments').select('*, sales(invoice_no, total_amount)').eq('id', shipmentId).maybeSingle()
    if (sErr || !shipment) return json({ error: 'Shipment not found' }, 404)
    if (shipment.tenant_id !== tenantId) return json({ error: 'Forbidden' }, 403)

    const { data: cred } = await admin.from('courier_credentials').select('*').eq('tenant_id', tenantId).eq('provider', provider).eq('is_active', true).maybeSingle()
    if (!cred) return json({ error: `${provider} credentials not configured` }, 400)

    let result: { tracking: string; consignment: string; label?: string; raw: any }

    if (provider === 'steadfast') {
      const base = (cred.steadfast_base_url || 'https://portal.packzy.com/api/v1').replace(/\/$/, '')
      const res = await fetch(`${base}/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': cred.steadfast_api_key,
          'Secret-Key': cred.steadfast_secret_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice: shipment.sales?.invoice_no || shipment.id.slice(0, 8),
          recipient_name: shipment.recipient_name,
          recipient_phone: shipment.recipient_phone,
          recipient_address: `${shipment.shipping_address || ''} ${shipment.city || ''}`.trim(),
          cod_amount: Number(shipment.sales?.total_amount || 0),
          note: shipment.notes || '',
        }),
      })
      const payload = await res.json()
      if (!res.ok || payload?.status >= 400) {
        return json({ error: 'Steadfast error', details: payload }, 400)
      }
      result = {
        tracking: payload?.consignment?.tracking_code || '',
        consignment: String(payload?.consignment?.consignment_id || ''),
        raw: payload,
      }
    } else {
      const base = (cred.pathao_base_url || 'https://api-hermes.pathao.com').replace(/\/$/, '')
      // Get/refresh access token
      let token = cred.pathao_access_token as string | null
      const expiresAt = cred.pathao_token_expires_at ? new Date(cred.pathao_token_expires_at).getTime() : 0
      if (!token || Date.now() > expiresAt - 60_000) {
        const tRes = await fetch(`${base}/aladdin/api/v1/issue-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: cred.pathao_client_id,
            client_secret: cred.pathao_client_secret,
            username: cred.pathao_username,
            password: cred.pathao_password,
            grant_type: 'password',
          }),
        })
        const tJson = await tRes.json()
        if (!tRes.ok || !tJson?.access_token) return json({ error: 'Pathao auth failed', details: tJson }, 400)
        token = tJson.access_token
        await admin.from('courier_credentials').update({
          pathao_access_token: tJson.access_token,
          pathao_refresh_token: tJson.refresh_token,
          pathao_token_expires_at: new Date(Date.now() + (tJson.expires_in || 3600) * 1000).toISOString(),
        }).eq('id', cred.id)
      }

      const res = await fetch(`${base}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: cred.pathao_store_id,
          merchant_order_id: shipment.sales?.invoice_no || shipment.id.slice(0, 8),
          recipient_name: shipment.recipient_name,
          recipient_phone: shipment.recipient_phone,
          recipient_address: `${shipment.shipping_address || ''} ${shipment.city || ''}`.trim(),
          recipient_city: Number(body.recipient_city) || 1,
          recipient_zone: Number(body.recipient_zone) || 1,
          delivery_type: 48,
          item_type: 2,
          item_quantity: 1,
          item_weight: Number(shipment.weight || 0.5),
          amount_to_collect: Math.round(Number(shipment.sales?.total_amount || 0)),
          item_description: shipment.notes || 'Order',
        }),
      })
      const payload = await res.json()
      if (!res.ok) return json({ error: 'Pathao error', details: payload }, 400)
      const d = payload?.data || {}
      result = {
        tracking: d.consignment_id || d.merchant_order_id || '',
        consignment: String(d.consignment_id || ''),
        raw: payload,
      }
    }

    await admin.from('shipments').update({
      courier: provider,
      courier_provider: provider,
      tracking_no: result.tracking,
      courier_consignment_id: result.consignment,
      courier_label_url: result.label || null,
      courier_payload: result.raw,
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    }).eq('id', shipmentId)

    await admin.from('shipment_status_history').insert({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: 'shipped',
      note: `Sent to ${provider}. Tracking: ${result.tracking}`,
      changed_by: userId,
    })

    return json({ success: true, tracking: result.tracking, consignment: result.consignment })
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