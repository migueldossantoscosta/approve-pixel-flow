# Design Proof (18)

Age como um Engenheiro Full-Stack Sénior e Arquiteto de Software. O teu objetivo é construir uma aplicação web completa, responsiva e pronta para produção chamada "ProofSync".

---

### 1. VISÃO GERAL DO PRODUTO

ProofSync é uma plataforma minimalista de revisão de design, controlo de versões e aprovação formal de trabalhos para freelancers e pequenos criadores visuais.

* O Criador gere projetos, envia versões de ficheiros e monitoriza estados.

* O Cliente final acede através de um link público seguro (token UUID), SEM necessidade de criar conta ou fazer login, podendo deixar notas visuais e aprovar formalmente o trabalho.

---

### 2. STACK TECNOLÓGICA

* Framework: Next.js 14+ (App Router, Server Actions, TypeScript)

* UI & Estilos: Tailwind CSS, shadcn/ui, Lucide Icons

* Backend & Base de Dados: Supabase (PostgreSQL, Supabase Auth para criadores, Supabase Storage para ficheiros)

* Segurança: Row Level Security (RLS) rigoroso no PostgreSQL

---

### 3. MODELO DE DADOS (Supabase / PostgreSQL)

Desenha as migrações SQL para as seguintes tabelas:

1. `profiles`:

   - `id` (UUID, PK, ligado a auth.users)

   - `full_name` (text), `email` (text), `created_at` (timestamptz)

2. `projects`:

   - `id` (UUID, PK)

   - `creator_id` (UUID, FK -> profiles.id)

   - `title` (text)

   - `client_name` (text)

   - `created_at` (timestamptz)

3. `deliverables` (itens a rever dentro de um projeto, ex: "Capa do Álbum", "Poster"):

   - `id` (UUID, PK)

   - `project_id` (UUID, FK -> projects.id)

   - `title` (text)

   - `share_token` (UUID único gerado por omissão para acesso público)

4. `versions`:

   - `id` (UUID, PK)

   - `deliverable_id` (UUID, FK -> deliverables.id)

   - `version_number` (int, ex: 1, 2, 3)

   - `image_url` (text)

   - `status` (enum: 'pending_review', 'changes_requested', 'approved')

   - `approved_at` (timestamptz, nullable)

   - `approved_by_name` (text, nullable)

   - `created_at` (timestamptz)

5. `feedback_pins`:

   - `id` (UUID, PK)

   - `version_id` (UUID, FK -> versions.id)

   - `x_coord_pct` (float - percentagem relativa de 0 a 100 para manter responsividade)

   - `y_coord_pct` (float - percentagem relativa de 0 a 100)

   - `comment` (text)

   - `author_name` (text, ex: "Cliente" ou o nome do freelancer)

   - `is_resolved` (boolean, default false)

   - `created_at` (timestamptz)

---

### 4. FLUXOS E FUNCIONALIDADES PRINCIPAIS

#### A. Painel do Freelancer (Autenticado - `/dashboard`)

1. Gestão de Projetos: Criar projeto e adicionar deliverables.

2. Upload de Versões: Arrastar e largar imagens para o Supabase Storage criando novas versões sequenciais (V1, V2...).

3. Gestor de Estado: Visualizar pins de feedback deixados pelo cliente e marcá-los como "resolvidos".

4. Partilha: Copiar link único para o cliente: `/review/[share_token]`.

#### B. Interface Pública de Revisão do Cliente (`/review/[share_token]`)

1. Sem Autenticação: O cliente abre o link em desktop ou telemóvel e vê imediatamente o trabalho.

2. Sistema de Pinning Visual:

   - Clicar/tocar na imagem cria um pin interativo na posição percentual exata (`x%`, `y%`).

   - Abre um balão pop-up minimalista para escrever o feedback.

3. Modo Comparação (Side-by-Side Slider):

   - Se houver mais de uma versão, permitir selecionar duas versões e usar um controlo de deslize (slider dividido antes/depois) para ver o que mudou.

4. Bloqueio & Aprovação Formal:

   - Botão de ação evidente: "Aprovar Versão Final".

   - Pede confirmação com nome do cliente.

   - Atualiza o estado da versão para `'approved'`, regista o timestamp e bloqueia a adição de novos pins nessa versão.

---

### 5. REQUISITOS TÉCNICOS & UX

* Responsividade: A imagem deve calcular coordenadas relativas em percentagem (`%`), para que um pin colocado no ecrã de um telemóvel apareça exatamente no mesmo sítio num monitor desktop.

* Feedback Visual: Utilização de estados com cores neutras e limpas (design brutalista suave ou minimalista escuro).

* RLS (Row Level Security): O cliente público com o token tem permissões estritas para:

  - `SELECT` apenas no deliverable associado ao token e nas suas versões/pins.

  - `INSERT` na tabela `feedback_pins`.

  - `UPDATE` limitado ao campo de aprovação na tabela `versions`.

---

### 6. PLANO DE RESPOSTA INICIAL

Por favor, não despejes todo o código de uma só vez. Começa por:

1. Apresentar o script SQL completo para o Supabase (tabelas, índices, enums e políticas RLS).

2. Estrutura de pastas recomendada para o Next.js (App Router).

3. O código do componente principal: o visualizador interativo de imagem com posicionamento percentual de pins (`InteractiveCanvas.tsx`).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://approve-pixel-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/983396b8-ae1f-4d37-9ef2-5995317b6ae6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
