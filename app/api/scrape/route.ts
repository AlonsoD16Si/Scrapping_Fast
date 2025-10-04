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
      timeout: 10000,
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
    // aqui dice que es lo que va a extraer de la poagina
    const title =
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      "Sin título";

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $("p").first().text().trim() ||
      "Sin descripción";

    const images: string[] = [];
    $("img").each((_, element) => {
      const src = $(element).attr("src");
      if (src) {
        try {
          const imageUrl = new URL(src, url).href;
          images.push(imageUrl);
        } catch {}
      }
    });

    const links: string[] = [];
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        try {
          const linkUrl = new URL(href, url).href;
          links.push(linkUrl);
        } catch {}
      }
    });
    // HASTA AQUI

    // EL CONTENIDO QUE NO QUIERO QUE SE MUESTRE
    $(
      "script, style, nav, header, footer, aside, .nav, .navigation, .menu"
    ).remove();

    const text = $("body").text().replace(/\s+/g, " ").trim();
    // DEPENDIENDO DE LO QUE EXTRAIGA GENERA EL JSON
    const result = {
      title,
      description,
      url,
      images: [...new Set(images)],
      links: [...new Set(links)],
      text,
      timestamp: new Date().toISOString(),
      totalImages: images.length,
      totalLinks: links.length,
      textLength: text.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en scraping:", error);

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
          { error: "Acceso denegado: El sitio web bloquea el scraping." },
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
      { error: "Error interno del servidor al realizar el scraping" },
      { status: 500 }
    );
  }
}
