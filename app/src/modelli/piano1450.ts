// Modello di piano alimentare trascritto da "1450 - PIATTO COMPLETO.docx" di Valentina.
// Testi originali; gli alimenti in maiuscolo nel Word qui sono in **grassetto** per la stampa.
// I numeri tra le opzioni sono frequenze settimanali, come nel suo piano.
import { SezionePiano } from "../types";

let n = 0;
const id = () => `sez${++n}`;

export const MODELLO_1450 = {
  nome: "1450 – Piatto completo",
  kcal: 1450,
  sezioni: (): SezionePiano[] => [
    {
      id: id(), titolo: "Colazione", icona: "☕", inclusa: true,
      elementi: [
        { k: "testo", testo: "**Prima di colazione:** un bicchiere di acqua tiepida con un cucchiaio di semi di lino (a bisogno in caso di intestino lento)." },
        { k: "testo", testo: "**Bevanda:** tè verde o infuso di frutta; a piacere 1 caffè, da preferire a stomaco pieno (se consumato)." },
        {
          k: "opzioni", titolo: "Scegliere tra:", voci: [
            { testo: "40-50 g di **pane di segale tostato** + 2 **uova** strapazzate/occhio di bue (o 1 uovo + 100 ml albume) + 1 tipo di **verdura** (pomodorini, insalatina…) oppure 1/3 di **avocado**" },
            { testo: "40-50 g di **pane di segale tostato** + 50-60 g di **salmone affumicato selvaggio** + 1 tipo di **verdura** (pomodorini, insalatina…) oppure 1/3 di **avocado**" },
            { titolo: "Pancake", testo: "Frullare 1 banana (o ½ banana + ½ mela) + 1 uovo/100 ml di albume + 3 cucchiai di farina di avena/riso integrale/grano saraceno + un pizzico di cannella + 1 cucchiaio di semi di lino/chia + poco lievito per dolci + 1 cucchiaino di olio di cocco/girasole/evo. Cuocere 2 minuti per lato." },
            {
              titolo: "Porridge d'avena", testo: "Ammollare 3-4 cucchiai di **fiocchi di avena** + un cucchiaio di semi di chia/lino con acqua calda a copertura (o riscaldare al momento). Al mattino aggiungere 150 g di **yogurt bianco** 0-2% non dolcificato + qualche pezzo di frutta oleosa come mandorle, nocciole… (o 1 cucchiaino in crema) oppure 10 g di cioccolato fondente > 85%. A piacere un pizzico di cannella/cacao. Aggiungere 1 frutto fresco o frutti rossi a completamento.",
              nota: "Esempi: mela cotta + cannella + pinoli · cocco + pistacchi + cioccolato fondente · mandorle + cacao + lamponi",
            },
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Spuntino mattino – pomeriggio", icona: "🍎", inclusa: true,
      elementi: [
        {
          k: "opzioni", titolo: "Scegliere tra:", voci: [
            { testo: "6-7 **mandorle** + 1 **frutto** medio", nota: "Alternare la tipologia di frutta; la banana è da preferire ½, mescolata ad un altro piccolo frutto." },
            { testo: "**Crudité di verdure** + 5-6 **olive verdi**" },
            { testo: "1 **yogurt vegetale** di cocco o mandorla non dolcificato + 1 **frutto** medio" },
          ],
        },
        { k: "testo", testo: "È consigliato tostare la frutta oleosa scaldandola in una padella fino a che profuma. Lasciar raffreddare e poi conservarla in un vaso di vetro. Può essere preparata in grande quantità." },
      ],
    },
    {
      id: id(), titolo: "Pranzo", icona: "🍝", inclusa: true, nuovaPagina: true,
      elementi: [
        { k: "avviso", testo: "**Importante:** per la gestione glicemica il primo piatto va sempre accompagnato da un piatto di verdura cruda o cotta, da consumare come antipasto, condito con un cucchiaino di olio evo e limone a piacere." },
        {
          k: "opzioni", titolo: "Scegliere tra:", voci: [
            { frequenza: "3 volte", testo: "60-70 g di **cereali in chicco**: quinoa, riso integrale originario (tondo), riso nero, rosso, orzo, farro" },
            { testo: "60-70 g di **cous cous di farro**" },
            { testo: "70 g di **pasta** di farro, grano saraceno o pasta di legumi" },
          ],
        },
        { k: "testo", testo: "**Condimento:** il sugo dovrà essere almeno pari al volume della pasta o del cereale cotto. Dovrà contenere verdura spadellata, alla griglia, al vapore o al forno tra quelle indicate. Se non desiderato, consumare la verdura a parte." },
        {
          k: "elenco", titolo: "Aggiungere qualche cucchiaio (70-80 g) di:", voci: [
            "**pesce** (totani, vongole, branzino, calamari, gamberi…)",
            "**carne bianca** (pollo, coniglio, tacchino, vitello)",
            "120-150 g cotti di **legumi** (ceci o hummus di legumi), anche sotto forma di zuppa aggiungendo 40-50 g di cereale in chicco",
            "**tonno** al naturale",
          ],
        },
        { k: "avviso", testo: "**1 volta a settimana** è possibile sostituire la pasta o il cous cous con 50-60 g di **piadina integrale di farro** farcita con: 1 tipo di verdura cruda + 1 tipo di verdura cotta + 1 tipo di proteina (5-6 fette di bresaola, un petto di pollo alla griglia, 2 uova strapazzate, pesce fresco) + olive/avocado/1 cucchiaio di yogurt greco + 1 cucchiaio di semi di chia, girasole o canapa decorticati." },
      ],
    },
    {
      id: id(), titolo: "Cena", icona: "🍽", inclusa: true,
      elementi: [
        { k: "avviso", testo: "**Antipasto:** iniziare il pasto con un piatto di verdura cruda o cotta, condito con un cucchiaino di olio evo e limone a piacere." },
        {
          k: "opzioni", titolo: "Scegliere tra:", voci: [
            { frequenza: "2 volte", testo: "150 g di **carne bianca**" },
            { frequenza: "1-2 volte", testo: "2 **uova**" },
            { frequenza: "2 volte", testo: "180-200 g di **pesce**: merluzzo, platessa, orata, branzino… (salmone selvaggio 120 g)" },
            { frequenza: "1-2 volte", testo: "**Zuppa di legumi** con 2-3 tipi di verdura, senza patate + 50 g secchi/150 g cotti di legume + 30 g di cereali (tra quelli del pranzo) o pane di segale tostato" },
          ],
        },
        {
          k: "elenco", titolo: "Aggiungere:", voci: [
            "**verdura cotta** (al dente)",
            "50 g di **pane integrale tostato** di segale o di farro integrale, oppure 30 g di **riso basmati** (o altri cereali scritti sopra), oppure 1-2 volte 150 g di **patate** bollite e lasciate raffreddare dopo la cottura",
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Da limitare", icona: "🧂", inclusa: true, nuovaPagina: true,
      elementi: [
        {
          k: "elenco", voci: [
            "**Latticini** (se non scritti nel piano)", "**Caffè**: massimo 2 al giorno", "**Ginseng**", "**Zucchero bianco**",
            "**Edulcoranti artificiali**", "**Frumento**", "**Piselli** (da limitare in caso di reazione avversa da favismo)", "**Iceberg e lattuga**",
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Note", icona: "💧", inclusa: true,
      elementi: [
        { k: "testo", testo: "**Integrazione:** —" },
        {
          k: "elenco", voci: [
            "Bere **fuori pasto 1,5 litri** di acqua con residuo fisso < 100 mg",
            "Evitare l'acqua del rubinetto, da preferire in **bottiglia di vetro**, soprattutto in caso di tiroiditi o ipotiroidismo",
            "**Tisane** libere",
            "È consentito **un pasto libero a settimana**",
          ],
        },
        { k: "testo", testo: "**Attività fisica:** inserimento di attività cardio e di costruzione muscolare." },
      ],
    },
    {
      id: id(), titolo: "Condimenti e dolcificanti", icona: "🥄", inclusa: true,
      elementi: [
        {
          k: "tabella", righe: [
            ["Olio e.v.o. 100% italiano, non da comunità europea", "2-3 cucchiai al giorno, da preferire a crudo"],
            ["Sale integrale marino o himalayano (rosa)", "In piccola quantità"],
            ["Gomasio, tamari", "Al posto del sale come insaporitore"],
            ["Aceto di mele, acidulato di umeboshi", ""],
            ["Spezie e erbe aromatiche", "Limitare pepe e peperoncino"],
            ["Malto di orzo/riso (no se è tolto il glutine), sciroppo di agave/acero, stevia pura, miele non pastorizzato", "Limitare l'uso dei dolcificanti"],
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Gruppi alimentari", icona: "🥗", inclusa: true, informativa: true, nuovaPagina: true,
      elementi: [
        { k: "testo", testo: "Lista generale per aiutare nella distinzione dei gruppi alimentari. Valutare e scegliere a seconda di ciò che è consentito nel proprio piano alimentare, secondo le indicazioni delle pagine precedenti." },
        { k: "immagini", chiavi: ["proteine-vegetali", "proteine-uova-latticini", "proteine-carne-pesce"], altezzaMm: 19 },
        {
          k: "voci", voci: [
            { titolo: "Proteine di origine animale", testo: "**Carne:** bianca (pollo, tacchino, coniglio, faraona), rosata (maiale, vitello), rossa (manzo, agnello, cavallo). **Pesce e animali marini:** molluschi (gamberetti, aragosta, astice, gamberi, mazzancolle, scampi, polpo, calamari, seppie, totani, vongole, cozze), pesci di mare (branzino, orata, sardine, alici, acciughe, pesce spada e tonno da limitare, merluzzo, sgombro, platessa, sogliola), pesci d'acqua dolce (salmone selvaggio surgelato/affumicato, persico, trota, luccio, carpa). **Latticini:** yogurt vaccino/caprino/ovino, ricotta, robiola, parmigiano reggiano, pecorino. **Uova.**" },
            { titolo: "Proteine di origine vegetale", testo: "**Legumi:** fagioli, ceci, lenticchie, azuki, soia. **Tofu:** derivato dalla bevanda di soia cagliata. **Tempeh:** derivato dalla bevanda di soia fermentata. **Seitan:** derivato del glutine dei cereali." },
          ],
        },
        { k: "immagini", chiavi: ["carboidrati"], altezzaMm: 26 },
        {
          k: "voci", voci: [
            { titolo: "Carboidrati", testo: "**Pane e derivati** (gallette, fette biscottate, wasa). **Cereali** con glutine (frumento, segale, farro, kamut, orzo, grani antichi: senatore cappelli, timilia, arso, russello, gentil rosso, jervicella, maiorca, saragolla) e senza glutine (riso nero/rosso/basmati/integrale/selvatico, quinoa, amaranto, avena, grano saraceno, teff, miglio, mais, sorgo) e **farine di cereali**. **Patate. Legumi. Frutta e verdura. Dolcificanti naturali** (miele, melassa, malto di riso o di orzo)." },
          ],
        },
        { k: "immagini", chiavi: ["grassi-1", "grassi-2"], altezzaMm: 19 },
        {
          k: "voci", voci: [
            { titolo: "Grassi", testo: "**Avocado. Frutta oleosa** (anacardi, mandorle, noci, noci brasiliane, nocciole, pistacchi). **Arachidi** (legumi). **Cocco. Oli vegetali** (evo, cocco, semi). **Burro chiarificato** (ghee). **Semi oleosi** (chia, girasole, zucca, sesamo, canapa, lino)." },
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Cotture", icona: "🍜", inclusa: true, informativa: true,
      elementi: [
        { k: "immagini", chiavi: ["cotture"], altezzaMm: 30 },
        {
          k: "voci", voci: [
            { titolo: "Padella", testo: "Aggiungere un filo di olio evo dopo aver aggiunto l'alimento. Evitare i soffritti; se la ricetta lo richiede, aggiungere un cucchiaio di acqua e lasciar appassire prima di aggiungere l'olio. Per aumentare il sapore si possono usare aglio o cipolla liofilizzati in polvere o in scaglie (senza conservanti o oli), spezie, erbe aromatiche." },
            { titolo: "Forno", testo: "A cottura diretta con un filo di olio evo, erbe e spezie a piacere; per più croccantezza si può aggiungere farina di cereali consentiti o fiocchi non dolcificati. Possibile la cottura al cartoccio con la carta forno (evitare l'alluminio) o in vasocottura." },
            { titolo: "Vapore", testo: "" },
            { titolo: "Piastra", testo: "Evitare di abbrustolire troppo gli alimenti ed evitare la carbonizzazione; nel caso, scartare la parte scura." },
            { titolo: "Friggitrice ad aria", testo: "Può sostituire la friggitrice classica, senza condimenti o con un cucchiaino di olio evo. Evitare temperature oltre 180°, che favoriscono la formazione di composti tossici." },
            { titolo: "Slow cooking", testo: "Con elettrodomestici appositi che cuociono a bassa temperatura per tempi più lunghi." },
            { titolo: "Pressione", testo: "Riduce a circa ¼ il tempo di cottura: utile per cereali integrali o cibi che richiedono lunga cottura." },
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Consigli per la spesa e la preparazione", icona: "🥕", inclusa: true, informativa: true, nuovaPagina: true,
      elementi: [
        {
          k: "voci", voci: [
            { titolo: "Frutta e verdura", testo: "Scegliere frutta e verdura **biologica** e/o da **coltivatori a km zero, stagionale e non trattata**: più ricca di micronutrienti e con meno pesticidi ed erbicidi. La frutta si può consumare cruda, in macedonia o cotta: a pezzetti, 5 minuti con un cucchiaio di acqua e a piacere un cucchiaino di cannella, vaniglia o altre spezie. L'insalata è da preferire fresca, non confezionata in atmosfera protetta. Le zuppe dovranno contenere al massimo 3 tipi di verdura, evitando la patata, con cotture di 20-25 minuti al massimo. Per evitare fermentazione lasciarla a pezzetti o passarla con il passaverdure; se frullata a immersione, attendere un paio d'ore prima del consumo. Si può aggiungere 1 cm di alga kombu a persona, ammollata in acqua tiepida, per evitare gonfiori." },
            { titolo: "Carne e pesce", testo: "Scegliere **pesce pescato** e non da allevamento, **carne senza antibiotici e OGM**, da preferire biologica. Preferire il pesce di taglia piccola come il pesce azzurro. Consumare pesci di grossa taglia (salmone, tonno, spada) al massimo 1 volta ogni 10 giorni. Il tonno in scatola non è consigliato: limitarlo a 1 volta a settimana, al naturale e in vasetto di vetro." },
            { titolo: "Cereali", testo: "Prima dell'uso sciacquarli bene. Si cuociono per assorbimento: 1 parte di cereale con 2 parti di acqua fredda e un pizzico di sale integrale, a fuoco lento e coperto fino a completo assorbimento. Si possono preparare in quantità e conservare in frigorifero 5-6 giorni, ben scolati. Il cous cous va reidratato con acqua bollente pari al suo volume. La pasta va scelta integrale, meglio di cereali alternativi (farro, timilia, arso, senatore cappelli), **essiccata lentamente** e biologica. Per un indice glicemico più basso cuocerla al dente e abbinarla sempre a verdura cruda o poco cotta. **Senza glutine:** riso, mais, quinoa, grano saraceno, amaranto, miglio, avena, teff. **Con glutine:** frumento, grano, kamut, farro, orzo, grani antichi." },
            { titolo: "Uova", testo: "Consigliata una cottura non troppo prolungata per una buona digeribilità: all'occhio di bue, strapazzate, frittata senza latte con verdure, alla coque (6 minuti al massimo dall'ebollizione) o in camicia. Utilizzare uova **codice 0**." },
            { titolo: "Legumi", testo: "Lasciarli in ammollo almeno 8 ore per eliminare sostanze che favoriscono il gonfiore. Cuocerli al vapore, bolliti o in casseruola con erbe o spezie. Si possono usare farine 100% di legume per polpette, farinata, crêpes. La pasta di legumi non va lavata: cuocerla 2-3 minuti dall'ebollizione e abbinarla a un sugo di verdura. Solo in caso di necessità, precotti in vasetto di vetro o surgelati senza conservanti." },
          ],
        },
      ],
    },
    {
      id: id(), titolo: "Pesi e porzioni", icona: "🥣", inclusa: true, informativa: true, nuovaPagina: true,
      elementi: [
        { k: "testo", testo: "Indicazione visiva delle porzioni:" },
        { k: "immagini", chiavi: ["porzioni"], altezzaMm: 60 },
        { k: "avviso", testo: "Salvo diversa indicazione, gli alimenti del piano si intendono **pesati a crudo**." },
        { k: "testo", testo: "Se pesi gli alimenti da cotti, puoi usare questi indici di conversione pratici:" },
        {
          k: "tabella", righe: [
            ["Pasta: aumenta circa ×2,5", "50 g crudi ≈ 120-130 g cotti"],
            ["Riso: aumenta circa ×2,5 – ×3", "50 g crudi ≈ 130-150 g cotti"],
            ["Cereali (farro, orzo, cous cous…): aumentano circa ×2 – ×2,5", "50 g crudi ≈ 100-125 g cotti"],
            ["Patate: rimangono quasi invariate", "100 g crudi ≈ 100-120 g cotti"],
            ["Carne: diminuisce circa ×0,7 – ×0,75", "100 g crudi ≈ 70-75 g cotti"],
            ["Pesce: diminuisce circa ×0,7 – ×0,75", "100 g crudi ≈ 70-75 g cotti"],
          ],
        },
        {
          k: "voci", voci: [
            { titolo: "Legumi: secco – fresco", testo: "I legumi secchi, rispetto al prodotto surgelato, ammollato e fresco, pesano il 70% in meno: 250 g di fagioli freschi corrispondono a circa 75 g di fagioli secchi." },
            { titolo: "Legumi: crudo – cotto", testo: "Ceci secchi: moltiplicare il peso per 3; fagioli e lenticchie: moltiplicare per 2,5. Esempio: 250 g di fagioli freschi = 625 g di fagioli lessi." },
          ],
        },
      ],
    },
  ],
};
