interface Env {
  BREVO_API_KEY: string;
  BREVO_LIST_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const raw = await context.request.text();
    const { email, company } = JSON.parse(raw) as { email?: string; company?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: Record<string, unknown> = {
      email,
      listIds: [Number(context.env.BREVO_LIST_ID)],
      updateEnabled: true,
    };
    if (company) {
      body.attributes = { COMPANY: company };
    }

    const resp = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': context.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // New contact created or updated
    if (resp.status === 201 || resp.status === 204) {
      return new Response(JSON.stringify({ success: true, message: "You're on the list. We'll reach out when AgentTrail Cloud launches." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Treat duplicate contact as success (Brevo returns 400 with duplicate_parameter)
    if (resp.status === 400) {
      const errText = await resp.text();
      try {
        const errBody = JSON.parse(errText) as { code?: string; message?: string };
        if (errBody?.code === 'duplicate_parameter') {
          return new Response(JSON.stringify({ success: true, message: "You're on the list. We'll reach out when AgentTrail Cloud launches." }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // If JSON parse fails, fall through to generic error below
      }
      console.error('Brevo API error', resp.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'Something went wrong. Try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Waitlist API error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};
