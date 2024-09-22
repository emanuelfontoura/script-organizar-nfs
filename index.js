const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
    ignoreAttrs: false
});

if (!fs.existsSync(path.join(__dirname, 'ENTRADAS'))) {
    fs.mkdirSync(path.join(__dirname, 'ENTRADAS'), { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, 'SAIDAS'))) {
    fs.mkdirSync(path.join(__dirname, 'SAIDAS'), { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, 'INUTILIZADOS'))) {
    fs.mkdirSync(path.join(__dirname, 'INUTILIZADOS'), { recursive: true });
}


const chavesNotasEntrada = [];
const chavesNotasSaida = [];
const chavesEventos = [];

// Função para processar arquivos XML
async function processFiles() {
    const args = process.argv.slice(2)

    const cnpj = args[0].split('=')[1]

    try {
        const files = await fs.promises.readdir(__dirname);
        
        // Processar cada arquivo XML
        for (const file of files) {
            if (path.extname(file) === '.xml') {
                const filePath = path.join(__dirname, file);
                
                if (file.includes("INUTILIZADO")) {
                    await fs.promises.rename(filePath, path.join(__dirname, 'INUTILIZADOS', file));
                    continue; // pula para o próximo arquivo
                }

                const content = await fs.promises.readFile(filePath, 'utf-8');
                const result = await parser.parseStringPromise(content);

                if (result.procEventoNFe) {
                    chavesEventos.push({ chave: result.procEventoNFe.retEvento.infEvento.chNFe, file: file });
                } else {
                    // Verifica o tipo de NF: 0 = Entrada, 1 = Saída
                    if (result.nfeProc.NFe.infNFe.emit.CNPJ !== cnpj) {
                        await fs.promises.rename(filePath, path.join(__dirname, "ENTRADAS", file));
                        chavesNotasEntrada.push({ chave: result.nfeProc.protNFe.infProt.chNFe, file: file });
                    } else {
                        await fs.promises.rename(filePath, path.join(__dirname, 'SAIDAS', file));
                        chavesNotasSaida.push({ chave: result.nfeProc.protNFe.infProt.chNFe, file: file });
                    }
                }
            }
        }

        // Processar os eventos e movê-los para as pastas corretas
        for (const evento of chavesEventos) {
            const matchEntrada = chavesNotasEntrada.find(nota => nota.chave === evento.chave);
            const matchSaida = chavesNotasSaida.find(nota => nota.chave === evento.chave);

            if (matchEntrada) {
                await fs.promises.rename(path.join(__dirname, evento.file), path.join(__dirname, 'ENTRADAS', evento.file));
            } else if (matchSaida) {
                await fs.promises.rename(path.join(__dirname, evento.file), path.join(__dirname, 'SAIDAS', evento.file));
            } else {
                console.log(`Nenhuma nota correspondente encontrada para o evento: ${evento.file}`);
            }
        }
    } catch (error) {
        console.error('Erro ao processar os arquivos:', error);
    }
}

// Executar o processamento
processFiles();