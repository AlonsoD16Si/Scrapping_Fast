import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "URL no válida" }, { status: 400 });
    }

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const $ = cheerio.load(response.data);
    const baseUrl = new URL(url);
    
    // Extraer todos los enlaces visibles y ocultos
    const visibleLinks: string[] = [];
    const hiddenLinks: string[] = [];
    const allUrls: string[] = [];

    // Enlaces visibles en <a> tags
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href && href.trim() !== "") {
        try {
          const linkUrl = new URL(href, url).href;
          visibleLinks.push(linkUrl);
          allUrls.push(linkUrl);
        } catch {}
      }
    });

    // Enlaces en formularios
    $("form[action]").each((_, element) => {
      const action = $(element).attr("action");
      if (action && action.trim() !== "") {
        try {
          const actionUrl = new URL(action, url).href;
          visibleLinks.push(actionUrl);
          allUrls.push(actionUrl);
        } catch {}
      }
    });

    // Enlaces ocultos en atributos data-*, href en elementos no <a>, etc.
    $("[data-url], [data-href], [data-link]").each((_, element) => {
      const dataUrl = $(element).attr("data-url") || 
                     $(element).attr("data-href") || 
                     $(element).attr("data-link");
      if (dataUrl && dataUrl.trim() !== "") {
        try {
          const hiddenUrl = new URL(dataUrl, url).href;
          hiddenLinks.push(hiddenUrl);
          allUrls.push(hiddenUrl);
        } catch {}
      }
    });

    // Enlaces en JavaScript (búsqueda básica en scripts)
    $("script").each((_, element) => {
      const scriptContent = $(element).html() || "";
      // Buscar URLs en el contenido JavaScript
      const urlMatches = scriptContent.match(/['"`](https?:\/\/[^'"`\s]+)['"`]/g) || [];
      urlMatches.forEach(match => {
        const cleanUrl = match.replace(/['"`]/g, "");
        try {
          new URL(cleanUrl); // Validar URL
          hiddenLinks.push(cleanUrl);
          allUrls.push(cleanUrl);
        } catch {}
      });
    });

    // Buscar URLs en atributos src, href de elementos no procesados
    $("[src], [href]").not("a, img, script, link").each((_, element) => {
      const src = $(element).attr("src") || $(element).attr("href");
      if (src && src.trim() !== "" && src.startsWith("http")) {
        try {
          const hiddenUrl = new URL(src, url).href;
          hiddenLinks.push(hiddenUrl);
          allUrls.push(hiddenUrl);
        } catch {}
      }
    });

    // Buscar patrones de URL en el texto del DOM
    const bodyText = $("body").text();
    const textUrlMatches = bodyText.match(/https?:\/\/[^\s<>"']+/g) || [];
    textUrlMatches.forEach(textUrl => {
      try {
        new URL(textUrl); // Validar URL
        hiddenLinks.push(textUrl);
        allUrls.push(textUrl);
      } catch {}
    });

    // Remover duplicados y filtrar
    const uniqueVisibleLinks = [...new Set(visibleLinks)];
    const uniqueHiddenLinks = [...new Set(hiddenLinks.filter(link => !visibleLinks.includes(link)))];
    const uniqueAllUrls = [...new Set(allUrls)];

    // Categorizar enlaces por tipo
    const internalLinks = uniqueAllUrls.filter(link => {
      try {
        const linkUrl = new URL(link);
        return linkUrl.hostname === baseUrl.hostname;
      } catch {
        return false;
      }
    });

    const externalLinks = uniqueAllUrls.filter(link => {
      try {
        const linkUrl = new URL(link);
        return linkUrl.hostname !== baseUrl.hostname;
      } catch {
        return false;
      }
    });

    const result = {
      url,
      timestamp: new Date().toISOString(),
      visibleUrls: uniqueVisibleLinks,
      hiddenUrls: uniqueHiddenLinks,
      allUrls: uniqueAllUrls,
      internalUrls: internalLinks,
      externalUrls: externalLinks,
      statistics: {
        totalUrls: uniqueAllUrls.length,
        visibleCount: uniqueVisibleLinks.length,
        hiddenCount: uniqueHiddenLinks.length,
        internalCount: internalLinks.length,
        externalCount: externalLinks.length,
      },
      categories: {
        visible: uniqueVisibleLinks,
        hidden: uniqueHiddenLinks,
        internal: internalLinks,
        external: externalLinks,
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en mapeo de URLs:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ENOTFOUND") {
        return NextResponse.json(
          { error: "No se pudo conectar con el sitio web. Verifica la URL." },
          { status: 400 }
        );
      }
      if (error.code === "ECONNABORTED") {
        return NextResponse.json(
          { error: "Timeout: El sitio web tardó demasiado en responder." },
          { status: 408 }
        );
      }
      if (error.response?.status === 403) {
        return NextResponse.json(
          { error: "Acceso denegado: El sitio web bloquea el mapeo." },
          { status: 403 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: "Página no encontrada (404)." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error interno del servidor al mapear URLs" },
      { status: 500 }
    );
  }
}
