import axios from 'axios';

const sanitizeHtml = (html: string): string => {
  // Basic sanitizer to strip unsafe tags and inline event handlers
  let sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/ href\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/ href\s*=\s*'javascript:[^']*'/gi, '');

  return sanitized;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: (status) => status < 500, // Accept 4xx errors but not 5xx
    });

    // Check if we got a valid response
    if (response.status >= 400) {
      return new Response(
        JSON.stringify({ 
          error: `HTTP ${response.status}`, 
          detail: `Server returned ${response.status} status`
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let html = typeof response.data === 'string' ? response.data : String(response.data);
    
    // Check if we actually got HTML content
    if (!html || html.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Empty response', 
          detail: 'The server returned empty content'
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Add base href to resolve relative URLs
    const baseUrl = new URL(url);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}/`;
    
    if (html.includes('<head')) {
      html = html.replace(
        /<head(.*?)>/i,
        (match) => `${match}<base href="${baseHref}">`
      );
    } else {
      html = `<head><base href="${baseHref}"></head>` + html;
    }

    // Add responsive viewport and basic styling
    const responsiveCSS = `
      <style>
        body { 
          margin: 0; 
          padding: 20px; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          max-width: 100%;
          overflow-x: hidden;
        }
        img { max-width: 100%; height: auto; }
        table { width: 100%; overflow-x: auto; display: block; white-space: nowrap; }
        pre { overflow-x: auto; }
        .highlight-citation {
          background-color: #fde047 !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          box-shadow: 0 0 0 2px #facc15 !important;
        }
        * { box-sizing: border-box; }
      </style>
    `;

    if (html.includes('<head')) {
      html = html.replace('</head>', responsiveCSS + '</head>');
    } else {
      html = responsiveCSS + html;
    }

    const sanitized = sanitizeHtml(html);

    return new Response(JSON.stringify({ html: sanitized }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching page:', error.message);
    
    // Try alternative approach for CORS-blocked sites
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('CORS')) {
      try {
        // Fallback: try to fetch with minimal headers
        const fallbackResponse = await axios.get(url, {
          responseType: 'text',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebPageBot/1.0)',
          },
          validateStatus: () => true, // Accept any status
        });
        
        if (fallbackResponse.data && typeof fallbackResponse.data === 'string') {
          let html = fallbackResponse.data;
          const baseUrl = new URL(url);
          const baseHref = `${baseUrl.protocol}//${baseUrl.host}/`;
          
          if (html.includes('<head')) {
            html = html.replace(/<head(.*?)>/i, (match) => `${match}<base href="${baseHref}">`);
          } else {
            html = `<head><base href="${baseHref}"></head>` + html;
          }
          
          const responsiveCSS = `<style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;max-width:100%;overflow-x:hidden}img{max-width:100%;height:auto}table{width:100%;overflow-x:auto;display:block;white-space:nowrap}pre{overflow-x:auto}.highlight-citation{background-color:#fde047!important;padding:2px 4px!important;border-radius:3px!important;box-shadow:0 0 0 2px #facc15!important}*{box-sizing:border-box}</style>`;
          html = html.includes('<head') ? html.replace('</head>', responsiveCSS + '</head>') : responsiveCSS + html;
          
          const sanitized = sanitizeHtml(html);
          return new Response(JSON.stringify({ html: sanitized }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch page', 
        detail: error?.message || 'Unknown error',
        errorType: error.code || 'UNKNOWN'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
