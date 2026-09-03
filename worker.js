const MODELO = "@cf/meta/llama-3.1-8b-instruct-fast";

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
  async fetch(request, env) {
    const url = new URL(request.url);
    const caminho = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CABECALHOS_CORS });
    }

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

      if (termo.length > 200) {
        return responderJson(
          { erro: "Escreva algo mais curto, com até 200 caracteres." },
          400
        );
      }

      try {
        const resposta = await env.AI.run(MODELO, {
          messages: [
            { role: "system", content: INSTRUCAO_DE_SISTEMA },
            { role: "user", content: "Explique de forma simples: " + termo },
          ],
        });

        return responderJson({
          termo: termo,
          explicacao: resposta.response,
        });
      } catch (erro) {
        return responderJson(
          { erro: "A inteligência artificial não respondeu: " + erro.message },
          502
        );
      }
    }

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