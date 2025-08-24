// Reconhecimento de voz
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var recognition = new SpeechRecognition();

recognition.continuous = true; 
recognition.lang = 'pt-BR'; 
recognition.interimResults = false; 
recognition.maxAlternatives = 1; 

var diagnostic = document.querySelector('.output');

// Pontos do campus (nós) - coordenadas reais
const pontos = {
  entrada: { lat: -11.1820000, lng: -40.536900 }, // Entrada principal (adicione a coordenada real se necessário)
  bifurcacao1: { lat: -11.1823076, lng: -40.536858 }, // Primeira bifurcação
  bifurcacao2: { lat: -11.1822864, lng: -40.5366955 }, // Segunda bifurcação
  direcao_ensino: { lat: -11.182414, lng: -40.5367314 },
  direcao: { lat: -11.1829314, lng: -40.5370565 }, // Direção Geral
  gabinete: { lat: -11.1829577, lng: -40.5371 },
  gabinete_comunicacao: { lat: -11.1825766, lng: -40.5368283 }, // Gabinete de comunicação e audiovisual
  setor_pedagogico: { lat: -11.1827908, lng: -40.5370218 },
  capne: { lat: -11.1828657, lng: -40.5370838 },
  cores: { lat: -11.182339, lng: -40.5367162 }
};

// Grafo (arestas) - conexões baseadas no mapa
const grafo = {
  entrada: ["bifurcacao1"],
  bifurcacao1: ["entrada", "bifurcacao2", "gabinete_comunicacao"],
  gabinete_comunicacao: ["bifurcacao1"],
  bifurcacao2: ["bifurcacao1", "direcao_ensino", "direcao", "gabinete", "setor_pedagogico", "capne", "cores"],
  direcao_ensino: ["bifurcacao2"],
  direcao: ["bifurcacao2", "gabinete"],
  gabinete: ["direcao", "bifurcacao2"],
  setor_pedagogico: ["bifurcacao2"],
  capne: ["bifurcacao2"],
  cores: ["bifurcacao2"]
};

// Calcula distância Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = angle => angle * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Dijkstra simplificado
function dijkstra(grafo, inicio, fim) {
  let dist = {}, prev = {}, visitados = new Set();
  for (let no in grafo) { dist[no]=Infinity; prev[no]=null; }
  dist[inicio]=0;

  while (visitados.size < Object.keys(grafo).length) {
    let u=null;
    for (let no in dist) {
      if (!visitados.has(no) && (u===null || dist[no]<dist[u])) u=no;
    }
    if(u===null || dist[u]===Infinity) break;
    visitados.add(u);
    for(let vizinho of grafo[u]) {
      let d = calcularDistancia(pontos[u].lat, pontos[u].lng, pontos[vizinho].lat, pontos[vizinho].lng);
      let alt = dist[u]+d;
      if(alt<dist[vizinho]) { dist[vizinho]=alt; prev[vizinho]=u; }
    }
  }

  let caminho=[]; let atual=fim;
  while(atual){ caminho.unshift(atual); atual=prev[atual]; }
  return {caminho, distancia: dist[fim]};
}

// Função para narrar o caminho
function narrarCaminho(texto) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'pt-BR';
    window.speechSynthesis.speak(utter);
  }
}

// Função para ir até o local
function irPara(local) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
  // Ponto de início fixo: entrada
  let inicio = "entrada";
      let fim = local;

      if(pontos[fim]) {
        let resultado = dijkstra(grafo, inicio, fim);
        let distancia = resultado.distancia;
        let textoDistancia = distancia>=1000 ? (distancia/1000).toFixed(2)+" quilômetros" : Math.round(distancia)+" metros";
        let destinoFalado = fim.replace(/_/g, ' ')
          .replace('direcao', 'direção geral')
          .replace('direcao ensino', 'direção de ensino')
          .replace('gabinete comunicacao', 'gabinete de comunicação e audiovisual')
          .replace('setor pedagogico', 'setor pedagógico')
          .replace('capne', 'CAPNE')
          .replace('cores', 'corredor das cores')
          .replace('bifurcacao1', 'primeira bifurcação')
          .replace('bifurcacao2', 'segunda bifurcação');
        let textoRota = `Rota até ${destinoFalado} (${textoDistancia}). Caminho: ${resultado.caminho.map(p=>p.replace(/_/g, ' ').replace('direcao', 'direção geral').replace('direcao ensino', 'direção de ensino').replace('gabinete comunicacao', 'gabinete de comunicação e audiovisual').replace('setor pedagogico', 'setor pedagógico').replace('capne', 'CAPNE').replace('cores', 'corredor das cores').replace('bifurcacao1', 'primeira bifurcação').replace('bifurcacao2', 'segunda bifurcação')).join(', ')}.`;
        diagnostic.textContent = textoRota;
        narrarCaminho(textoRota);
      } else {
        diagnostic.textContent = "Local não encontrado no mapa.";
        narrarCaminho("Local não encontrado no mapa.");
      }
    }, function(error){
      diagnostic.textContent = "Erro ao acessar sua localização.";
      narrarCaminho("Erro ao acessar sua localização.");
    });
  } else {
    diagnostic.textContent = "Seu navegador não suporta geolocalização.";
    narrarCaminho("Seu navegador não suporta geolocalização.");
  }
}

// Reconhecimento de voz
recognition.onresult = function(event) {
  let length = event.results.length;  
  let command = event.results[length-1][0].transcript.trim().toLowerCase();

  switch(true) {
    case command.includes("modo escuro"):
      document.body.classList.add("dark-mode");
      diagnostic.textContent = "Modo escuro ativado!";
      narrarCaminho("Modo escuro ativado!");
      break;
    case command.includes("modo claro"):
      document.body.classList.remove("dark-mode");
      diagnostic.textContent = "Modo claro ativado!";
      narrarCaminho("Modo claro ativado!");
      break;
    case command.includes("direção geral"):
      irPara("direcao");
      break;
    case command.includes("direção de ensino"):
      irPara("direcao_ensino");
      break;
    case command.includes("gabinete"):
      irPara("gabinete");
      break;
    case command.includes("gabinete de comunicação"):
    case command.includes("comunicação"):
      irPara("gabinete_comunicacao");
      break;
    case command.includes("setor pedagógico"):
      irPara("setor_pedagogico");
      break;
    case command.includes("capne"):
      irPara("capne");
      break;
    case command.includes("cores"):
      irPara("cores");
      break;
    case command.includes("primeira bifurcação"):
      irPara("bifurcacao1");
      break;
    case command.includes("segunda bifurcação"):
      irPara("bifurcacao2");
      break;
    default:
      diagnostic.textContent = "Local não reconhecido. Tente novamente.";
      narrarCaminho("Local não reconhecido. Tente novamente.");
  }
}

// Botões de controle
document.querySelector('#btn-start').onclick = function() {
  recognition.start();
  diagnostic.textContent = "Estou ouvindo... diga um local!";
}
document.querySelector('#btn-stop').onclick = function() {
  recognition.stop();
  diagnostic.textContent = "Reconhecimento de voz parado.";
}