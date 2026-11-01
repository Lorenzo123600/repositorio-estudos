export const subjects = ['Todas as áreas','Linguagens','Humanas','Natureza','Matemática'];
export const questions = [
{area:'Matemática',topic:'Porcentagem',text:'Uma mochila custa R$ 200. Após um desconto de 20%, o preço recebe um aumento de 10%. Qual é o preço final?',options:['R$ 160','R$ 176','R$ 180','R$ 200','R$ 220'],answer:1,explanation:'O desconto resulta em 200 × 0,80 = 160. O aumento incide sobre esse novo valor: 160 × 1,10 = R$ 176. Percentuais sucessivos não devem ser simplesmente somados.'},
{area:'Linguagens',topic:'Funções da linguagem',text:'Em uma campanha de vacinação, a frase “Proteja quem você ama: vacine-se” usa predominantemente qual função da linguagem?',options:['Metalinguística','Fática','Poética','Conativa','Emotiva'],answer:3,explanation:'A função conativa busca influenciar o comportamento do destinatário. O uso do imperativo “vacine-se” reforça o convite à ação.'},
{area:'Humanas',topic:'Cidadania',text:'A Constituição de 1988 é conhecida como Constituição Cidadã porque ampliou, entre outros aspectos:',options:['O voto censitário','A censura prévia','Os direitos sociais e a participação democrática','O poder hereditário','As restrições à liberdade de associação'],answer:2,explanation:'A Constituição de 1988 consolidou direitos civis, políticos e sociais, como saúde e educação, e ampliou mecanismos de participação democrática.'},
{area:'Natureza',topic:'Ecologia',text:'O lançamento de esgoto rico em nutrientes em um lago pode provocar eutrofização. Qual consequência está associada a esse processo?',options:['Aumento permanente do oxigênio dissolvido','Redução da decomposição','Eliminação de todas as algas','Diminuição de nutrientes','Queda do oxigênio pela intensa decomposição'],answer:4,explanation:'O excesso de nutrientes favorece a proliferação de algas. A decomposição da matéria orgânica consome oxigênio, podendo causar a morte de peixes.'},
{area:'Matemática',topic:'Razão e proporção',text:'Em um mapa de escala 1:50.000, dois pontos estão separados por 4 cm. Qual é a distância real?',options:['200 m','500 m','2 km','20 km','200 km'],answer:2,explanation:'4 × 50.000 = 200.000 cm. Dividindo por 100.000 para converter centímetros em quilômetros, obtemos 2 km.'},
{area:'Natureza',topic:'Energia elétrica',text:'Um aparelho de 1.000 W funciona durante 2 horas por dia. Qual é seu consumo em 30 dias?',options:['2 kWh','30 kWh','60 kWh','600 kWh','60.000 kWh'],answer:2,explanation:'1.000 W = 1 kW. Energia = potência × tempo = 1 × 2 × 30 = 60 kWh.'},
{area:'Humanas',topic:'Geografia urbana',text:'A impermeabilização do solo nas cidades contribui para enchentes principalmente porque:',options:['Aumenta a infiltração','Reduz o escoamento superficial','Impede toda evaporação','Reduz a infiltração e aumenta o escoamento superficial','Elimina as chuvas'],answer:3,explanation:'Asfalto e concreto dificultam a infiltração da água. Assim, um volume maior escoa pela superfície, sobrecarregando a drenagem urbana.'},
{area:'Linguagens',topic:'Variação linguística',text:'Ao analisar diferentes modos regionais de falar português, uma abordagem que respeita a diversidade linguística reconhece que:',options:['Só a variedade formal tem regras','As variedades expressam identidades e se adequam a contextos','A fala regional impede a comunicação sempre','A escrita deve reproduzir apenas uma região','Toda variação é um erro'],answer:1,explanation:'As variedades linguísticas possuem regularidades e expressam identidades sociais e regionais. A adequação depende da situação de comunicação.'}
];
export const plan = [
['Organize sua largada','Linguagens','Interpretação de texto e funções da linguagem','Resolva 10 questões e anote os erros.'],
['Conecte os acontecimentos','Humanas','Cidadania, democracia e Constituição','Revise direitos sociais e resolva 10 questões.'],
['Construa seu argumento','Redação','Tese e estrutura dissertativa','Escreva uma introdução e dois argumentos.'],
['Leia além das palavras','Linguagens','Gêneros textuais, gráficos e variação linguística','Treine leitura de textos e charges.'],
['Revise com contexto','Humanas','Brasil, urbanização e meio ambiente','Faça um mapa de relações entre os temas.'],
['Uma redação completa','Redação','Texto dissertativo-argumentativo','Reserve 60 minutos e revise as cinco competências.'],
['Consolide e respire','Revisão','Revise seus erros de Linguagens e Humanas','Faça revisão leve e confira a logística da prova.'],
['Domine as proporções','Matemática','Porcentagem, razão, escala e regra de três','Resolva 10 questões com atenção às unidades.'],
['Entenda os ecossistemas','Natureza','Ecologia, ciclos e impactos ambientais','Revise cadeias alimentares e eutrofização.'],
['Transforme dados em pontos','Matemática','Estatística, probabilidade e gráficos','Treine média, mediana e leitura de tabelas.'],
['Energia no cotidiano','Natureza','Eletricidade, calor e transformações químicas','Revise potência, consumo e estequiometria.'],
['Treine com tempo','Simulado','Matemática e Ciências da Natureza','Resolva um bloco de questões e corrija com calma.'],
['Seu caderno de erros','Revisão','Retome os assuntos com mais dificuldade','Explique em voz alta como resolver cada erro.'],
['Você fez o caminho','Revisão','Fórmulas essenciais e preparação','Revisão curta, documentos separados e descanso.']
];
export function score(answers) { return Object.entries(answers).filter(([i,a])=>questions[Number(i)]?.answer===a).length; }
