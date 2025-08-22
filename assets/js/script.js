// Reconhecimento de voz
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var recognition = new SpeechRecognition();

recognition.continuous = true; 
recognition.lang = 'pt-BR'; 
recognition.interimResults = false; 
recognition.maxAlternatives = 1; 

var diagnostic = document.querySelector('.output');

// Pontos do campus (nós)
const pontos = {
  entrada: { lat: -11.1810, lng: -40.5100 },
  corredor1: { lat: -11.1812, lng: -40.5105 },
  corredor2: { lat: -11.1815, lng: -40.5110 },
  cantina: { lat: -11.1820, lng: -40.5120 },
  depen: { lat: -11.1810, lng: -40.5110 },
  direcao: { lat: -11.1815, lng: -40.5115 },
  direcao_ensino: { lat: -11.1845, lng: -42.5125 },
  banheiros: { lat: -11.1822, lng: -40.5105 },
  lab01: { lat: -11.1830, lng: -40.5122 },
  capine: { lat: -11.1818, lng: -40.5130 },
  setor_pedagogico: { lat: -11.1825, lng: -40.5118 },
  auditorio: { lat: -11.1835, lng: -40.5125 }
};

// Grafo (arestas)
const grafo = {
  entrada: ["corredor1"],
  corredor1: ["entrada", "corredor2"],
  corredor2: ["corredor1", "cantina", "depen", "direcao", "direcao_ensino"], // conectando direcao_ensino
  cantina: ["corredor2", "lab01"],
  depen: ["corredor2"],
  direcao: ["corredor2"],
  direcao_ensino: ["corredor2"], // agora tem conexão
  lab01: ["cantina", "auditorio"],
  auditorio: ["lab01"],
  banheiros: ["corredor2"],
  capine: ["corredor2"],
  setor_pedagogico: ["corredor2"]
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

// Função para ir até o local
function irPara(local) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      let minhaLat = position.coords.latitude;
      let minhaLng = position.coords.longitude;

      // Ponto mais próximo do usuário (simplificado: entrada)
      let inicio = "entrada";
      let fim = local;

      if(pontos[fim]) {
        let resultado = dijkstra(grafo, inicio, fim);
        let distancia = resultado.distancia;
        let textoDistancia = distancia>=1000 ? (distancia/1000).toFixed(2)+" km" : Math.round(distancia)+" m";

        diagnostic.textContent = `Rota até ${fim.toUpperCase()} (${textoDistancia}) → ${resultado.caminho.join(" → ")}`;
      } else {
        diagnostic.textContent = "Local não encontrado no mapa.";
      }
    }, function(error){
      diagnostic.textContent = "Erro ao acessar sua localização.";
    });
  } else {
    diagnostic.textContent = "Seu navegador não suporta geolocalização.";
  }
}

// Reconhecimento de voz
recognition.onresult = function(event) {
  let length = event.results.length;  
  let command = event.results[length-1][0].transcript.trim().toLowerCase();

  switch(true) {
    case command.includes("modo escuro"):
      document.body.classList.add("dark-mode"); // força ativar
      diagnostic.textContent = "Modo escuro ativado!";
      break;
    case command.includes("modo claro"):
      document.body.classList.remove("dark-mode"); // força desativar
      diagnostic.textContent = "Modo claro ativado!";
      break;
    case command.includes("depen"):
      irPara("depen");
      break;
    case command.includes("cantina"):
      irPara("cantina");
      break;
    case command.includes("direção geral"):
      irPara("direcao");
      break;
    case command.includes("direção de ensino"):
      irPara("direcao_ensino");
      break;
    case command.includes("banheiro"):
    case command.includes("banheiros"):
      irPara("banheiros");
      break;
    case command.includes("lab 01"):
    case command.includes("laboratório 1"):
      irPara("lab01");
      break;
    case command.includes("capine"):
      irPara("capine");
      break;
    case command.includes("setor pedagógico"):
      irPara("setor_pedagogico");
      break;
    case command.includes("auditório"):
      irPara("auditorio");
      break;
    default:
      diagnostic.textContent = "Local não reconhecido. Tente novamente.";
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
