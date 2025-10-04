import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query de búsqueda es requerido" }, { status: 400 });
    }

    // Simular búsqueda web usando DuckDuckGo (evita limitaciones de Google)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const searchResponse = await axios.get(searchUrl, {
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

    const $ = cheerio.load(searchResponse.data);
    const searchResults: any[] = [];

    // Extraer resultados de DuckDuckGo
    $(".result").each((index, element) => {
      if (index >= maxResults) return false;

      const titleElement = $(element).find(".result__title a");
      const snippetElement = $(element).find(".result__snippet");
      const urlElement = $(element).find(".result__url");

      const title = titleElement.text().trim();
      const snippet = snippetElement.text().trim();
      const url = titleElement.attr("href") || "";

      if (title && url) {
        searchResults.push({
          title,
          snippet,
          url,
          index: index + 1
        });
      }
    });

    // Si no encontramos resultados en el primer formato, intentar con otro selector
    if (searchResults.length === 0) {
      $("h2 a").each((index, element) => {
        if (index >= maxResults) return false;

        const title = $(element).text().trim();
        const url = $(element).attr("href") || "";
        const parentResult = $(element).closest(".web-result, .result");
        const snippet = parentResult.find(".snippet, .result__snippet").text().trim();

        if (title && url && url.startsWith("http")) {
          searchResults.push({
            title,
            snippet,
            url,
            index: index + 1
          });
        }
      });
    }

    // Obtener contenido completo de cada resultado
    const detailedResults = [];
    
    for (let i = 0; i < Math.min(searchResults.length, maxResults); i++) {
      const result = searchResults[i];
      
      try {
        console.log(`Scrapeando resultado ${i + 1}: ${result.url}`);
        
        const contentResponse = await axios.get(result.url, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        const content$ = cheerio.load(contentResponse.data);
        
        // Remover elementos no deseados
        content$("script, style, nav, header, footer, aside, .nav, .navigation, .menu, .advertisement, .ads").remove();
        
        // Extraer contenido útil
        const fullTitle = content$("title").text().trim() || 
                         content$('meta[property="og:title"]').attr("content") ||
                         content$("h1").first().text().trim() ||
                         result.title;

        const fullDescription = content$('meta[name="description"]').attr("content") ||
                               content$('meta[property="og:description"]').attr("content") ||
                               result.snippet;

        const fullText = content$("body").text().replace(/\s+/g, " ").trim();

        // Extraer párrafos principales
        const paragraphs: string[] = [];
        content$("p").each((_, el) => {
          const pText = content$(el).text().trim();
          if (pText.length > 50) { // Solo párrafos con contenido sustancial
            paragraphs.push(pText);
          }
        });

        // Extraer encabezados
        const headings: string[] = [];
        content$("h1, h2, h3, h4, h5, h6").each((_, el) => {
          const heading = content$(el).text().trim();
          if (heading.length > 5) {
            headings.push(heading);
          }
        });

        detailedResults.push({
          ...result,
          fullTitle,
          fullDescription,
          fullText: fullText.substring(0, 5000), // Limitar texto
          paragraphs: paragraphs.slice(0, 10), // Primeros 10 párrafos
          headings: headings.slice(0, 15), // Primeros 15 encabezados
          contentLength: fullText.length,
          wordCount: fullText.split(/\s+/).length,
          scrapedAt: new Date().toISOString()
        });

      } catch (contentError) {
        console.log(`Error scrapeando ${result.url}:`, contentError);
        // Mantener el resultado básico aunque falle el scraping completo
        detailedResults.push({
          ...result,
          fullTitle: result.title,
          fullDescription: result.snippet,
          fullText: result.snippet,
          paragraphs: [],
          headings: [],
          contentLength: 0,
          wordCount: 0,
          scrapingError: "No se pudo obtener contenido completo",
          scrapedAt: new Date().toISOString()
        });
      }
    }

    const finalResult = {
      query,
      timestamp: new Date().toISOString(),
      totalResults: searchResults.length,
      detailedResults,
      searchEngine: "DuckDuckGo",
      summary: {
        totalResultsProcessed: detailedResults.length,
        successfulScrapes: detailedResults.filter(r => !r.scrapingError).length,
        failedScrapes: detailedResults.filter(r => r.scrapingError).length,
        totalContentLength: detailedResults.reduce((sum, r) => sum + (r.contentLength || 0), 0),
        averageWordCount: Math.round(
          detailedResults.reduce((sum, r) => sum + (r.wordCount || 0), 0) / detailedResults.length
        )
      }
    };

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error("Error en búsqueda web:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ENOTFOUND") {
        return NextResponse.json(
          { error: "No se pudo conectar con el motor de búsqueda. Verifica tu conexión." },
          { status: 400 }
        );
      }
      if (error.code === "ECONNABORTED") {
        return NextResponse.json(
          { error: "Timeout: La búsqueda tardó demasiado en responder." },
          { status: 408 }
        );
      }
      if (error.response?.status === 403) {
        return NextResponse.json(
          { error: "Acceso denegado: El motor de búsqueda bloquea las consultas." },
          { status: 403 }
        );
      }
      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: "Demasiadas solicitudes: Rate limit excedido." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error interno del servidor al realizar la búsqueda web" },
      { status: 500 }
    );
  }
}
