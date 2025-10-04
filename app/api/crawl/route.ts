import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

interface CrawledPage {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
  links: string[];
  statusCode: number;
  contentLength: number;
  depth: number;
  crawledAt: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url, maxDepth = 2, maxPages = 20, sameOriginOnly = true } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 });
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL no válida" }, { status: 400 });
    }

    const crawledPages: CrawledPage[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit: { url: string; depth: number }[] = [{ url, depth: 0 }];
    
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    };

    while (urlsToVisit.length > 0 && crawledPages.length < maxPages) {
      const { url: currentUrl, depth } = urlsToVisit.shift()!;
      
      // Evitar URLs ya visitadas
      if (visitedUrls.has(currentUrl)) {
        continue;
      }
      
      visitedUrls.add(currentUrl);

      // Verificar si está dentro del límite de profundidad
      if (depth > maxDepth) {
        continue;
      }

      try {
        console.log(`Crawling (depth ${depth}): ${currentUrl}`);
        
        const response = await axios.get(currentUrl, {
          timeout: 10000,
          headers,
          validateStatus: (status) => status < 500, // Aceptar códigos de estado hasta 499
        });

        const $ = cheerio.load(response.data);
        
        // Extraer información de la página
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

        // Extraer imágenes
        const images: string[] = [];
        $("img").each((_, element) => {
          const src = $(element).attr("src");
          if (src) {
            try {
              const imageUrl = new URL(src, currentUrl).href;
              images.push(imageUrl);
            } catch {}
          }
        });

        // Extraer enlaces para continuar el crawling
        const pageLinks: string[] = [];
        $("a[href]").each((_, element) => {
          const href = $(element).attr("href");
          if (href && href.trim() !== "") {
            try {
              const linkUrl = new URL(href, currentUrl).href;
              pageLinks.push(linkUrl);
              
              // Agregar a la cola de URLs para visitar (si cumple las condiciones)
              if (depth < maxDepth && crawledPages.length < maxPages) {
                const linkUrlObj = new URL(linkUrl);
                
                // Verificar si debe ser del mismo origen
                const shouldCrawl = sameOriginOnly ? 
                  linkUrlObj.hostname === baseUrl.hostname : 
                  true;
                
                if (shouldCrawl && !visitedUrls.has(linkUrl) && 
                    !urlsToVisit.some(item => item.url === linkUrl)) {
                  urlsToVisit.push({ url: linkUrl, depth: depth + 1 });
                }
              }
            } catch {}
          }
        });

        // Limpiar contenido no deseado
        $("script, style, nav, header, footer, aside, .nav, .navigation, .menu").remove();
        const text = $("body").text().replace(/\s+/g, " ").trim();

        const crawledPage: CrawledPage = {
          url: currentUrl,
          title,
          description,
          text: text.substring(0, 3000), // Limitar texto por página
          images: [...new Set(images)],
          links: [...new Set(pageLinks)],
          statusCode: response.status,
          contentLength: text.length,
          depth,
          crawledAt: new Date().toISOString(),
        };

        crawledPages.push(crawledPage);

      } catch (error) {
        console.log(`Error crawling ${currentUrl}:`, error);
        
        let statusCode = 0;
        let errorMessage = "Error desconocido";
        
        if (axios.isAxiosError(error)) {
          statusCode = error.response?.status || 0;
          if (error.code === "ENOTFOUND") {
            errorMessage = "No se pudo resolver el dominio";
          } else if (error.code === "ECONNABORTED") {
            errorMessage = "Timeout de conexión";
          } else if (error.response?.status === 403) {
            errorMessage = "Acceso denegado";
          } else if (error.response?.status === 404) {
            errorMessage = "Página no encontrada";
          } else {
            errorMessage = error.message;
          }
        }

        const failedPage: CrawledPage = {
          url: currentUrl,
          title: "Error",
          description: errorMessage,
          text: "",
          images: [],
          links: [],
          statusCode,
          contentLength: 0,
          depth,
          crawledAt: new Date().toISOString(),
          error: errorMessage,
        };

        crawledPages.push(failedPage);
      }

      // Pequeña pausa entre requests para ser respetuoso con el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Compilar estadísticas
    const successfulPages = crawledPages.filter(page => !page.error);
    const failedPages = crawledPages.filter(page => page.error);
    const totalImages = crawledPages.reduce((sum, page) => sum + page.images.length, 0);
    const totalLinks = crawledPages.reduce((sum, page) => sum + page.links.length, 0);
    const averageContentLength = successfulPages.length > 0 ? 
      Math.round(successfulPages.reduce((sum, page) => sum + page.contentLength, 0) / successfulPages.length) : 0;

    const result = {
      startUrl: url,
      crawlSettings: {
        maxDepth,
        maxPages,
        sameOriginOnly,
      },
      crawledPages,
      statistics: {
        totalPagesCrawled: crawledPages.length,
        successfulPages: successfulPages.length,
        failedPages: failedPages.length,
        totalImages,
        totalLinks,
        uniqueUrls: visitedUrls.size,
        averageContentLength,
        crawlDepthReached: Math.max(...crawledPages.map(p => p.depth)),
      },
      summary: {
        pagesByDepth: Array.from({length: maxDepth + 1}, (_, depth) => ({
          depth,
          count: crawledPages.filter(p => p.depth === depth).length
        })),
        statusCodes: crawledPages.reduce((acc, page) => {
          acc[page.statusCode] = (acc[page.statusCode] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error en crawling:", error);

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
    }

    return NextResponse.json(
      { error: "Error interno del servidor al realizar el crawling" },
      { status: 500 }
    );
  }
}
