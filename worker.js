// worker.js
// Backend do Explica Fácil.
// Peça da nuvem: Workers AI, os modelos de inteligência artificial que rodam
// nos servidores da Cloudflare.
// Este arquivo inteiro vai colado no editor do Worker, no painel da Cloudflare.
//
// IMPORTANTE: o Worker precisa ter um binding de Workers AI chamado AI.

// O modelo usado. É um modelo de linguagem pequeno e rápido, do mesmo tipo que
// está por trás dos assistentes de conversa. A lista completa de modelos está
// em developers.cloudflare.com/workers-ai/models
const MODELO = "@cf/meta/llama-3.1-8b-instruct-fast";

// A instrução de sistema descreve o papel do modelo. Ela vale para toda
// conversa e é o lugar certo para fixar idioma, tamanho e tom da resposta.
const INSTRUCAO_DE_SISTEMA =
  "Você é um professor que explica qualquer assunto em português do Brasil, " +
  "em linguagem simples, para alguém que está começando. " +
  "Responda em no máximo dois parágrafos curtos. " +
  "Use um exemplo do dia a dia quando ajudar. " +
  "Não use termos técnicos sem explicar o que significam.";

const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function responderJson(dados, status) {
  return new Response(JSON.stringify(dados), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  // env é o segundo parâmetro do fetch. É por ele que o Worker chama a IA.
  async fetch(request, env) {
    const url = new URL(request.url);
    const caminho = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CABECALHOS_CORS });
    }

    // ROTA 1: POST /explicar
    // Recebe um termo e devolve a explicação gerada pelo modelo.
    if (request.method === "POST" && caminho === "/explicar") {
      let corpo;
      try {
        corpo = await request.json();
      } catch (erro) {
        return responderJson({ erro: "Envie um JSON com o campo termo." }, 400);
      }

      const termo = (corpo.termo || "").trim();

      if (termo === "") {
        return responderJson({ erro: "Escreva o que você quer entender." }, 400);
      }

      // O limite de tamanho não é frescura. Cada chamada consome parte da cota
      // gratuita diária, e um texto enorme consome mais.
      if (termo.length > 200) {
        return responderJson(
          { erro: "Escreva algo mais curto, com até 200 caracteres." },
          400
        );
      }

      try {
        // Aqui a peça Workers AI entra em cena.
        // O modelo já está nos servidores da Cloudflare. Nada é instalado nem
        // treinado, o Worker apenas envia as mensagens e recebe a resposta.
        const resposta = await env.AI.run(MODELO, {
          messages: [
            { role: "system", content: INSTRUCAO_DE_SISTEMA },
            { role: "user", content: "Explique de forma simples: " + termo },
          ],
        });

        // O texto gerado vem dentro do campo response.
        return responderJson({
          termo: termo,
          explicacao: resposta.response,
        });
      } catch (erro) {
        // O motivo mais comum de cair aqui é a cota diária gratuita ter
        // acabado. O binding ausente também cai aqui.
        return responderJson(
          { erro: "A inteligência artificial não respondeu: " + erro.message },
          502
        );
      }
    }

    // ROTA 2: GET /
    // Serve só para conferir, no navegador, que o Worker está no ar.
    if (request.method === "GET" && caminho === "/") {
      return responderJson({
        servico: "explica fácil",
        status: "no ar",
        modelo: MODELO,
      });
    }

    return responderJson({ erro: "Rota não encontrada." }, 404);
  },
};