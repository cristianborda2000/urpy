# Urpy & Cristhian - Dia dos Namorados

Abra `index.html` no navegador ou use `abrir-surpresa.url`.

Senha da surpresa:

`28/09/2016`

Tambem funciona com `28092016`.

## Fotos e videos

Coloque suas midias nestes caminhos:

- `assets/fotos/foto-01.jpg`
- `assets/fotos/foto-02.jpg`
- `assets/fotos/foto-03.jpg`
- `assets/videos/video-01.mp4`

Se quiser adicionar mais fotos ou videos, duplique um dos botoes `.media-card` em `index.html`
e troque o caminho em `data-media`, `src` e no texto do card.

## Musica

O botao "Abrir no YouTube" usa este link:

`https://www.youtube.com/watch?v=XyNMgfAsdiM&list=RDXyNMgfAsdiM&start_radio=1`

O site tambem tenta iniciar a musica automaticamente depois que a senha e digitada. Em alguns
celulares, o navegador pode bloquear autoplay com som; nesse caso, use o botao do YouTube.

## Carta envelope

A carta final abre quando toca no envelope. Para mudar a mensagem, edite o conteudo dentro de
`.envelope__letter` em `index.html`.

## Chat com histórico

Execute `node local-server.js` e abra `http://localhost:5500/chat.html`.
Abra o chat e escreva: n?o h? cadastro nem campo de nome. A p?gina sem convite abre a conversa compartilhada padr?o. Ambos acessam o chat diretamente pelo site, sem bot?o de convite.
As mensagens são salvas em `chat-data/` no servidor e sobrevivem a reinicializações.
Faça backup dessa pasta; ela não entra no Git. Não há criptografia de ponta a ponta.
Quem possui o link tem acesso à conversa. O nome é livre, sem autenticação de identidade.

Para celulares na mesma rede, execute no PowerShell:

```powershell
$env:HOST = '0.0.0.0'
node local-server.js
```

Acesse `http://IP-DO-COMPUTADOR:5500/chat.html` e copie o convite a partir desse endereço.
O computador deve estar ligado e a porta acessível na rede. `localhost` só funciona no próprio computador.
Para conversar pela internet, é necessário hospedar o servidor Node com HTTPS e armazenamento persistente.
Hospedagens apenas estáticas não executam a API do chat.

O botão Música abre o player do vídeo `clnvpWmBqOc`; há um link alternativo para o YouTube.
O áudio desse vídeo não foi baixado. O player requer internet e depende de o vídeo permitir incorporação.

## Acesso direto e resposta

A página inicial mantém a fênix e o botão Abrir chat. `/chat.html` mostra somente a conversa, com layout para celular.
Para responder, abra `/responder.html` no mesmo servidor. Os dois endereços usam a mesma conversa padrão.
A identificação de quem responde fica separada neste navegador; o endereço não é uma autenticação de administrador.
A página anterior com a fênix foi preservada em `/fenix.html`.
Os endereços localhost funcionam apenas neste computador. O acesso pela internet depende da publicação do servidor.

## Chat no dominio da Vercel

As funcoes `api/conversation.mjs` e `api/messages.mjs` conectam o site da Vercel ao banco persistente do Sites. O navegador usa o mesmo dominio para paginas e mensagens. Nao e necessario mudar os registros DNS para esta configuracao.
O backend e https://urpy-conversa.sprysheep1.chatgpt.site. O historico fica nesse backend; nao e gravado no disco temporario das funcoes da Vercel.
