"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Download,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Map,
  ArrowRight,
  Link,
  Scan,
} from "lucide-react";

type OperationType = "scrape" | "map" | "search" | "crawl";

interface ScrapingResult {
  title?: string;
  description?: string;
  url?: string;
  images?: string[];
  links?: string[];
  text?: string;
  // Para resultados específicos
  [key: string]: any;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<OperationType>("scrape");

  const operations = {
    scrape: {
      title: "Scrapear",
      description: "Extrae información general de una página web",
      icon: Search,
      placeholder: "https://ejemplo.com",
      inputType: "url" as const,
    },
    map: {
      title: "Mapear URLs",
      description: "Encuentra URLs visibles y ocultas en la página",
      icon: Map,
      placeholder: "https://ejemplo.com",
      inputType: "url" as const,
    },
    search: {
      title: "Buscar Web",
      description: "Busca en la web y obtiene contenido completo",
      icon: Globe,
      placeholder: "Escribe tu búsqueda...",
      inputType: "text" as const,
    },
    crawl: {
      title: "Rastrear Sitio",
      description: "Rastrea una URL y todas sus subpáginas",
      icon: Scan,
      placeholder: "https://ejemplo.com",
      inputType: "url" as const,
    },
  };

  const currentOperation = operations[operationType];

  const handleOperation = async () => {
    const inputValue = currentOperation.inputType === "url" ? url : query;
    if (!inputValue) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let endpoint = `/api/${operationType}`;
      let body: any = {};

      // Preparar el cuerpo de la petición según el tipo de operación
      switch (operationType) {
        case "scrape":
        case "map":
        case "crawl":
          body = { url: inputValue };
          break;
        case "search":
          body = { query: inputValue, maxResults: 5 };
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          `Error al realizar ${currentOperation.title.toLowerCase()}`
        );
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "scraping-results.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div className="float-animation mb-6">
            <Globe className="w-20 h-20 mx-auto text-black mb-4" />
          </motion.div>
          <h1 className="text-5xl font-bold text-black mb-4">
            Scrapping fast{" "}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-morphism rounded-2xl p-8 mb-8"
        >
          {/* Selector de operación */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-4">
              Selecciona el tipo de operación:
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(operations).map(([key, operation]) => {
                const IconComponent = operation.icon;
                const isActive = operationType === key;
                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOperationType(key as OperationType)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      isActive
                        ? "border-blue-500 bg-blue-500/20 text-blue-700"
                        : "border-white/20 bg-white/5 text-black hover:border-white/40"
                    }`}
                  >
                    <IconComponent
                      className={`w-6 h-6 mx-auto mb-2 ${
                        isActive ? "text-blue-600" : "text-black"
                      }`}
                    />
                    <div className="text-sm font-medium">{operation.title}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {operation.description}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Área de input */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type={currentOperation.inputType}
                value={currentOperation.inputType === "url" ? url : query}
                onChange={(e) => {
                  if (currentOperation.inputType === "url") {
                    setUrl(e.target.value);
                  } else {
                    setQuery(e.target.value);
                  }
                }}
                placeholder={currentOperation.placeholder}
                className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                disabled={loading}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOperation}
              disabled={
                loading || !(currentOperation.inputType === "url" ? url : query)
              }
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all duration-300 pulse-glow flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  {currentOperation.title}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-xl p-6 mb-8 border-red-300"
            >
              <div className="flex items-center gap-3 text-red-300">
                <AlertCircle className="w-6 h-6" />
                <p>{error}</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h2 className="text-2xl font-bold text-black">
                    Resultados - {currentOperation.title}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadResults}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar JSON
                </motion.button>
              </div>

              {/* Renderizar resultados según el tipo de operación */}
              {operationType === "scrape" && (
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3">
                      Información General
                    </h3>
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <p>
                        <span className="text-black/60">Título:</span>{" "}
                        <span className="text-black">{result.title}</span>
                      </p>
                      <p>
                        <span className="text-black/60">URL:</span>{" "}
                        <span className="text-black">{result.url}</span>
                      </p>
                      <p>
                        <span className="text-black/60">Descripción:</span>{" "}
                        <span className="text-black">{result.description}</span>
                      </p>
                    </div>
                  </div>

                  {result.images && result.images.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        Imágenes Encontradas ({result.images.length})
                      </h3>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                          {result.images.slice(0, 10).map((image, index) => (
                            <div
                              key={index}
                              className="text-sm text-black/80 p-2 bg-white/5 rounded truncate"
                            >
                              {image}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.links && result.links.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        Enlaces Encontrados ({result.links.length})
                      </h3>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="grid gap-2 max-h-40 overflow-y-auto">
                          {result.links.slice(0, 10).map((link, index) => (
                            <div
                              key={index}
                              className="text-sm text-black/80 p-2 bg-white/5 rounded truncate"
                            >
                              {link}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.text && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        Contenido de Texto
                      </h3>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-black/80 text-sm leading-relaxed max-h-40 overflow-y-auto">
                          {result.text.slice(0, 500)}...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {operationType === "map" && (
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3">
                      Estadísticas
                    </h3>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.statistics?.totalUrls || 0}
                          </div>
                          <div className="text-sm text-black/60">
                            Total URLs
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {result.statistics?.visibleCount || 0}
                          </div>
                          <div className="text-sm text-black/60">Visibles</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {result.statistics?.hiddenCount || 0}
                          </div>
                          <div className="text-sm text-black/60">Ocultas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {result.statistics?.externalCount || 0}
                          </div>
                          <div className="text-sm text-black/60">Externas</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.visibleUrls && result.visibleUrls.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        URLs Visibles ({result.visibleUrls.length})
                      </h3>
                      <div className="bg-white/5 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {result.visibleUrls
                          .slice(0, 20)
                          .map((url: string, index: number) => (
                            <div
                              key={index}
                              className="text-sm text-black/80 p-2 mb-1 bg-white/5 rounded truncate"
                            >
                              {url}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {result.hiddenUrls && result.hiddenUrls.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        URLs Ocultas ({result.hiddenUrls.length})
                      </h3>
                      <div className="bg-white/5 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {result.hiddenUrls
                          .slice(0, 20)
                          .map((url: string, index: number) => (
                            <div
                              key={index}
                              className="text-sm text-black/80 p-2 mb-1 bg-white/5 rounded truncate"
                            >
                              {url}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {operationType === "search" && (
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3">
                      Resumen de Búsqueda
                    </h3>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p>
                        <span className="text-black/60">Consulta:</span>{" "}
                        <span className="text-black">{result.query}</span>
                      </p>
                      <p>
                        <span className="text-black/60">
                          Resultados encontrados:
                        </span>{" "}
                        <span className="text-black">
                          {result.totalResults}
                        </span>
                      </p>
                      <p>
                        <span className="text-black/60">
                          Motor de búsqueda:
                        </span>{" "}
                        <span className="text-black">
                          {result.searchEngine}
                        </span>
                      </p>
                      {result.summary && (
                        <p>
                          <span className="text-black/60">
                            Scrapeados exitosamente:
                          </span>{" "}
                          <span className="text-black">
                            {result.summary.successfulScrapes}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {result.detailedResults &&
                    result.detailedResults.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-3">
                          Resultados Detallados
                        </h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {result.detailedResults.map(
                            (item: any, index: number) => (
                              <div
                                key={index}
                                className="bg-white/5 rounded-lg p-4"
                              >
                                <h4 className="font-semibold text-black mb-2">
                                  {item.title || item.fullTitle}
                                </h4>
                                <p className="text-sm text-black/60 mb-2">
                                  {item.url}
                                </p>
                                <p className="text-sm text-black/80 mb-2">
                                  {item.snippet || item.fullDescription}
                                </p>
                                {item.fullText && (
                                  <p className="text-xs text-black/70">
                                    {item.fullText.slice(0, 200)}...
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {operationType === "crawl" && (
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3">
                      Estadísticas del Crawling
                    </h3>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.statistics?.totalPagesCrawled || 0}
                          </div>
                          <div className="text-sm text-black/60">
                            Páginas Crawleadas
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {result.statistics?.successfulPages || 0}
                          </div>
                          <div className="text-sm text-black/60">Exitosas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {result.statistics?.failedPages || 0}
                          </div>
                          <div className="text-sm text-black/60">Fallidas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {result.statistics?.crawlDepthReached || 0}
                          </div>
                          <div className="text-sm text-black/60">
                            Profundidad Máxima
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.crawledPages && result.crawledPages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        Páginas Crawleadas
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {result.crawledPages.map((page: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white/5 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-black">
                                {page.title}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  page.error
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-green-500/20 text-green-300"
                                }`}
                              >
                                {page.error ? "Error" : `${page.statusCode}`}
                              </span>
                            </div>
                            <p className="text-sm text-black/60 mb-2">
                              Profundidad: {page.depth} | {page.url}
                            </p>
                            <p className="text-sm text-black/80">
                              {page.description}
                            </p>
                            {page.error && (
                              <p className="text-xs text-red-400 mt-2">
                                Error: {page.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
